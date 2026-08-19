import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, fireEvent, render, screen } from "@testing-library/react";
import type React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	createYouTubeMock,
	setYouTubeNamespace,
	YouTubePlayerState,
} from "@/shared/lib/testing";
import {
	SessionPlayerClient,
	SessionPlayerViewport,
} from "../session-player-client";

vi.mock("@tanstack/react-router");

describe("SessionPlayerClient", () => {
	let queryClient: QueryClient;

	beforeEach(() => {
		queryClient = new QueryClient({
			defaultOptions: {
				mutations: { retry: false },
				queries: { retry: false },
			},
		});
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	const renderWithClient = (ui: React.ReactElement) => {
		return render(
			<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>,
		);
	};

	const mockVod = {
		createdAt: new Date(),
		durationSeconds: 0,
		id: "vod_zero_duration",
		isPublished: true,
		mapName: "Oasis",
		rankTier: "Diamond",
		scenarios: [
			{
				explanationText: "No options scenario",
				id: "sc_no_opt",
				imageUrl: null,
				inputConfig: {},
				inputType: "MULTIPLE_CHOICE" as const,
				moduleType: "STRATEGY" as const,
				promptText: "Where to go?",
				timeLimitSeconds: null,
				timestampSeconds: 0,
				vodId: "vod_zero_duration",
			},
		],
		title: "Diamond Oasis Playthrough",
		updatedAt: new Date(),
		userId: "u1",
		youtubeVideoId: "oasis_vid",
	};

	it("renders controls and timeline markers correctly when duration is zero", async () => {
		// Arrange
		const youtube = createYouTubeMock(0);
		setYouTubeNamespace(youtube.namespace);

		// Act
		renderWithClient(<SessionPlayerClient vod={mockVod} />);
		await act(async () => {
			await Promise.resolve();
		});

		// Assert controls and zero progress
		expect(screen.getByRole("button", { name: /play video/i })).toBeDefined();
		expect(screen.getByRole("button", { name: /replay 10s/i })).toBeDefined();
		expect(screen.getByText("0m 00s / 0m 00s")).toBeDefined();

		// Act: click Play button
		act(() => {
			fireEvent.click(screen.getByRole("button", { name: /play video/i }));
		});

		// Act: click Replay button
		act(() => {
			fireEvent.click(screen.getByRole("button", { name: /replay 10s/i }));
		});
	});

	it("handles interactive play and pause toggle buttons", async () => {
		// Arrange
		const youtube = createYouTubeMock(600);
		setYouTubeNamespace(youtube.namespace);
		const activeVod = {
			...mockVod,
			durationSeconds: 600,
			title: "Grandmaster [Ana] Oasis",
		};

		// Act
		renderWithClient(<SessionPlayerClient vod={activeVod} />);
		await act(async () => {
			await Promise.resolve();
		});

		const player = youtube.players[0];
		act(() => {
			player.triggerReady();
			player.triggerStateChange(YouTubePlayerState.PLAYING);
		});

		// Assert pause button is visible when playing
		const pauseBtn = screen.getByRole("button", { name: /pause video/i });
		expect(pauseBtn.textContent).toContain("Pause");

		// Act: click Pause
		act(() => {
			fireEvent.click(pauseBtn);
		});

		// Assert play button is visible when paused
		const playBtn = screen.getByRole("button", { name: /play video/i });
		expect(playBtn.textContent).toContain("Play");

		// Act: click Play
		act(() => {
			fireEvent.click(playBtn);
		});
	});

	it("renders correctly when vod has no scenarios", async () => {
		// Arrange
		const emptyVod = { ...mockVod, scenarios: [] };
		renderWithClient(<SessionPlayerClient vod={emptyVod} />);
		await act(async () => {
			await Promise.resolve();
		});

		// Assert
		expect(screen.getByText("Scenario 0 / 0")).toBeDefined();
	});

	it("shows non-blocking buffering and blocking recovery actions", () => {
		// Arrange
		const onRetryMedia = vi.fn();
		const onRestartSession = vi.fn();
		const baseProps = {
			containerRef: vi.fn(),
			isCompleted: false,
			isLoading: false,
			isOverlayVisible: false,
			onReplayContext: vi.fn(),
			onRestartSession,
			onResume: vi.fn(),
			onRetryMedia,
			onSelectOption: vi.fn(),
			onSkipUnsupportedInput: vi.fn(),
			overlayScenarioData: null,
			overlayState: null,
		};

		// Act
		const { rerender } = render(
			<SessionPlayerViewport {...baseProps} mediaHealth="buffering" />,
		);
		expect(screen.getByRole("status").textContent).toContain("Buffering");
		rerender(<SessionPlayerViewport {...baseProps} mediaHealth="recovering" />);

		// Assert
		expect(screen.getByRole("alert").textContent).toContain("Recovering video");

		// Act
		rerender(<SessionPlayerViewport {...baseProps} mediaHealth="failed" />);
		fireEvent.click(screen.getByRole("button", { name: "Try again" }));
		fireEvent.click(screen.getByRole("button", { name: "Restart session" }));

		// Assert
		expect(onRetryMedia).toHaveBeenCalledTimes(1);
		expect(onRestartSession).toHaveBeenCalledTimes(1);
	});
});
