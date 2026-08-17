import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, fireEvent, render, screen } from "@testing-library/react";
import type React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	createYouTubeMock,
	installMockFrames,
	setYouTubeNamespace,
	YouTubePlayerState,
} from "@/shared/lib/testing";
import * as serverFns from "../../api/server-fns";
import { SessionPlayerPage } from "../session-player-page";

vi.mock("@tanstack/react-router");

describe("SessionPlayerPage", () => {
	const mockVod = {
		createdAt: new Date(),
		durationSeconds: 600,
		id: "vod_gm_ana",
		isPublished: true,
		mapName: "King's Row",
		rankTier: "Grandmaster",
		scenarios: [
			{
				explanationText: "Highground is optimal position.",
				id: "sc_1",
				imageUrl: null,
				inputConfig: {
					options: [
						{ id: "opt_1a", is_correct: true, text: "Highground Balcony" },
						{ id: "opt_1b", is_correct: false, text: "Lowground Arch" },
					],
				},
				inputType: "MULTIPLE_CHOICE" as const,
				moduleType: "STRATEGY" as const,
				promptText: "Where should Ana position?",
				timeLimitSeconds: null,
				timestampSeconds: 30.0,
				vodId: "vod_gm_ana",
			},
		],
		title: "Grandmaster Ana VOD — King's Row",
		youtubeVideoId: "dQw4w9WgXcQ",
	};

	let queryClient: QueryClient;

	beforeEach(() => {
		vi.resetModules();
		vi.useRealTimers();
		queryClient = new QueryClient({
			defaultOptions: {
				mutations: {
					retry: false,
				},
			},
		});
		vi.spyOn(serverFns, "recordAttempt").mockResolvedValue({
			attemptId: "att_test",
			success: true,
		} as never);
	});

	afterEach(() => {
		vi.restoreAllMocks();
		setYouTubeNamespace(undefined);
		document.head.replaceChildren();
		delete window.onYouTubeIframeAPIReady;
	});

	const renderWithClient = (ui: React.ReactElement) => {
		return render(
			<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>,
		);
	};

	it("renders VOD Not Found when vod is not found", async () => {
		// Act
		const page = await SessionPlayerPage({
			params: { id: "missing_id" },
			vod: null,
		});
		renderWithClient(page);

		// Assert
		expect(screen.getByText("VOD Not Found")).toBeDefined();
		expect(screen.getByText(/Back to VOD Catalog/i)).toBeDefined();
	});

	it("renders session header, video player container, and controls bar", async () => {
		// Arrange
		const youtube = createYouTubeMock(600);
		setYouTubeNamespace(youtube.namespace);

		// Act
		const page = await SessionPlayerPage({
			params: { id: "vod_gm_ana" },
			vod: mockVod,
		});
		renderWithClient(page);

		// Assert
		expect(screen.getByText("Grandmaster Ana VOD — King's Row")).toBeDefined();
		expect(screen.getByText("King's Row")).toBeDefined();
		expect(screen.getByText("Grandmaster")).toBeDefined();
		expect(screen.getByTestId("player-loading")).toBeDefined();
		expect(screen.getByTestId("play-pause-button")).toBeDefined();
	});

	it("displays ScenarioOverlay when scenario triggers and handles answer feedback", async () => {
		// Arrange
		const frameController = installMockFrames();
		const youtube = createYouTubeMock(600);
		setYouTubeNamespace(youtube.namespace);
		const progressionVod = {
			...mockVod,
			scenarios: [
				...mockVod.scenarios,
				{
					...mockVod.scenarios[0],
					id: "sc_2",
					inputConfig: {
						options: [
							{ id: "opt_2a", is_correct: false, text: "Hold the arch" },
							{ id: "opt_2b", is_correct: true, text: "Rotate to point" },
						],
					},
					promptText: "Where should Ana rotate next?",
					timestampSeconds: 60,
				},
			],
		};

		const page = await SessionPlayerPage({
			params: { id: "vod_gm_ana" },
			vod: progressionVod,
		});
		renderWithClient(page);
		await act(async () => {
			await Promise.resolve();
		});

		const player = youtube.players[0];
		act(() => {
			player.triggerReady();
			player.triggerStateChange(YouTubePlayerState.PLAYING);
		});

		// Act: simulate playhead reaching 30s
		player.getCurrentTime = vi.fn(() => 30.5);
		act(() => {
			frameController.flush();
		});

		// Assert overlay is rendered
		expect(screen.getByText("Where should Ana position?")).toBeDefined();
		expect(screen.getByText("Highground Balcony")).toBeDefined();
		expect(screen.queryByTestId("play-pause-button")).toBeNull();

		// Act: select option
		await act(async () => {
			fireEvent.click(screen.getByText("Highground Balcony"));
			await Promise.resolve();
		});

		// Assert feedback is rendered
		expect(screen.getByText("PASS")).toBeDefined();
		expect(screen.getByText("Highground is optimal position.")).toBeDefined();
		expect(screen.queryByTestId("play-pause-button")).toBeNull();
		expect(serverFns.recordAttempt).toHaveBeenCalledWith({
			data: {
				isCorrect: true,
				responseTimeMs: expect.any(Number),
				scenarioId: "sc_1",
				selectedOptionId: "opt_1a",
			},
		});

		// Act: resume playback
		act(() => {
			fireEvent.click(screen.getByTestId("resume-playback-button"));
		});

		// Assert next Scenario becomes active after resuming playback
		expect(screen.queryByText("Where should Ana position?")).toBeNull();
		player.getCurrentTime = vi.fn(() => 60.5);
		act(() => {
			frameController.flush();
		});
		expect(screen.getByText("Where should Ana rotate next?")).toBeDefined();

		// Act: select an incorrect option in the next Scenario
		await act(async () => {
			fireEvent.click(screen.getByText("Hold the arch"));
			await Promise.resolve();
		});

		// Assert FAIL evaluation and second Attempt Record
		expect(screen.getByText("FAIL")).toBeDefined();
		expect(serverFns.recordAttempt).toHaveBeenNthCalledWith(2, {
			data: {
				isCorrect: false,
				responseTimeMs: expect.any(Number),
				scenarioId: "sc_2",
				selectedOptionId: "opt_2a",
			},
		});
	});

	it("renders SessionSummaryPanel when session completes and allows retry", async () => {
		// Arrange
		const youtube = createYouTubeMock(600);
		setYouTubeNamespace(youtube.namespace);

		const page = await SessionPlayerPage({
			params: { id: "vod_gm_ana" },
			vod: mockVod,
		});
		renderWithClient(page);
		await act(async () => {
			await Promise.resolve();
		});

		const player = youtube.players[0];
		act(() => {
			player.triggerReady();
			player.triggerStateChange(YouTubePlayerState.ENDED);
		});

		// Assert summary panel is rendered
		expect(screen.getByTestId("session-summary-panel")).toBeDefined();
		expect(screen.getByText("Performance Summary")).toBeDefined();

		// Act: click retry session
		act(() => {
			fireEvent.click(screen.getByTestId("retry-session-button"));
		});

		// Assert summary panel is dismissed and player resets
		expect(screen.queryByTestId("session-summary-panel")).toBeNull();
		expect(player.seekTo).toHaveBeenCalledWith(0, true);
	});

	it("renders title without hero tag when no hero is in title", async () => {
		// Arrange
		const youtube = createYouTubeMock(600);
		setYouTubeNamespace(youtube.namespace);
		const vodWithoutHero = {
			...mockVod,
			title: "Grandmaster King's Row Defense",
		};

		// Act
		const page = await SessionPlayerPage({
			params: { id: "vod_gm_ana" },
			vod: vodWithoutHero,
		});
		renderWithClient(page);

		// Assert
		expect(screen.getByText("Grandmaster King's Row Defense")).toBeDefined();
		expect(screen.queryByText(/Hero:/)).toBeNull();
	});

	it("resolves async Promise params and searchParams correctly", async () => {
		// Arrange
		const youtube = createYouTubeMock(600);
		setYouTubeNamespace(youtube.namespace);

		// Act
		const page = await SessionPlayerPage({
			params: Promise.resolve({ id: "vod_gm_ana" }),
			searchParams: Promise.resolve({ modules: "STRATEGY" }),
			vod: mockVod,
		});
		renderWithClient(page);

		// Assert
		expect(screen.getByText("Grandmaster Ana VOD — King's Row")).toBeDefined();
	});

	it("renders VOD Not Found when vod is explicitly null", async () => {
		// Act
		const page = await SessionPlayerPage({
			params: { id: "null_vod" },
			vod: null,
		});
		renderWithClient(page);

		// Assert
		expect(screen.getByText("VOD Not Found")).toBeDefined();
	});
});
