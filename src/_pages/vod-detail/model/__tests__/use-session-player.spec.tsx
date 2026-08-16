import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook } from "@testing-library/react";
import type React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	createYouTubeMock,
	installMockFrames,
	PlaybackStatus,
	setYouTubeNamespace,
	YouTubePlayerState,
} from "@/shared/media";
import * as serverFns from "../../api/server-fns";
import {
	findCorrectOptionId,
	isSelectedOptionCorrect,
	resolveNewStatusState,
	useSessionPlayer,
} from "../use-session-player";

describe("useSessionPlayer", () => {
	const mockManifest = {
		createdAt: new Date(),
		durationSeconds: 600,
		id: "vod_gm_ana",
		isPublished: true,
		mapName: "King's Row",
		rankTier: "Grandmaster",
		scenarios: [
			{
				explanationText: "Balcony gives safe sightline.",
				id: "sc_1",
				imageUrl: null,
				inputConfig: {
					options: [
						{ id: "opt_1a", is_correct: true, text: "Balcony" },
						{ id: "opt_1b", is_correct: false, text: "Main Gate" },
					],
				},
				inputType: "MULTIPLE_CHOICE" as const,
				moduleType: "STRATEGY" as const,
				promptText: "Where to hold?",
				timeLimitSeconds: null,
				timestampSeconds: 30.0,
				vodId: "vod_gm_ana",
			},
			{
				explanationText: "Sleep aggressive dive.",
				id: "sc_2",
				imageUrl: null,
				inputConfig: {
					options: [
						{ id: "opt_2a", is_correct: true, text: "Sleep Dart" },
						{ id: "opt_2b", is_correct: false, text: "Biotic Grenade" },
					],
				},
				inputType: "MULTIPLE_CHOICE" as const,
				moduleType: "TACTICS" as const,
				promptText: "Reinhardt charging. Action?",
				timeLimitSeconds: 3,
				timestampSeconds: 60.0,
				vodId: "vod_gm_ana",
			},
			{
				explanationText: "Blade is available.",
				id: "sc_3",
				imageUrl: null,
				inputConfig: {
					options: [
						{ id: "opt_3a", is_correct: false, text: "0-25%" },
						{ id: "opt_3b", is_correct: true, text: "76-100%" },
					],
				},
				inputType: "MULTIPLE_CHOICE" as const,
				moduleType: "ULTIMATE" as const,
				promptText: "Estimate Genji ult.",
				timeLimitSeconds: null,
				timestampSeconds: 90.0,
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

	const createWrapper = () => {
		return ({ children }: { children: React.ReactNode }) => (
			<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
		);
	};

	it("initializes in LOADING state and transitions to PLAYING when player fires ready with autoplay", async () => {
		// Arrange
		const youtube = createYouTubeMock(600);
		setYouTubeNamespace(youtube.namespace);
		const container = document.createElement("div");

		// Act
		const { result } = renderHook(
			() =>
				useSessionPlayer({
					autoplay: true,
					initialManifest: mockManifest,
					vodId: "vod_gm_ana",
				}),
			{ wrapper: createWrapper() },
		);

		const initialState = result.current.state;

		act(() => {
			result.current.containerRef(container);
		});
		await act(async () => {
			await Promise.resolve();
		});

		const player = youtube.players[0];
		act(() => {
			player.triggerReady();
			player.triggerStateChange(YouTubePlayerState.PLAYING);
		});

		// Assert
		expect(initialState).toBe("LOADING");
		expect(result.current.state).toBe("PLAYING");
		expect(result.current.isReady).toBe(true);
		expect(result.current.activeScenarios).toHaveLength(3);
	});

	it("filters scenarios based on activeModuleKeys and sorts by timestampSeconds", () => {
		// Arrange
		const unsortedManifest = {
			...mockManifest,
			scenarios: [
				mockManifest.scenarios[2],
				mockManifest.scenarios[0],
				mockManifest.scenarios[1],
			],
		};

		// Act
		const { result } = renderHook(
			() =>
				useSessionPlayer({
					activeModuleKeys: ["ULTIMATE", "STRATEGY"],
					initialManifest: unsortedManifest,
					vodId: "vod_gm_ana",
				}),
			{ wrapper: createWrapper() },
		);

		// Assert
		expect(result.current.activeScenarios).toHaveLength(2);
		expect(result.current.activeScenarios[0].moduleType).toBe("STRATEGY");
		expect(result.current.activeScenarios[1].moduleType).toBe("ULTIMATE");
	});

	it("intercepts playhead time and pauses to enter SCENARIO_ACTIVE at scenario timestamp", async () => {
		// Arrange
		const frameController = installMockFrames();
		const youtube = createYouTubeMock(600);
		setYouTubeNamespace(youtube.namespace);
		const container = document.createElement("div");

		const { result } = renderHook(
			() =>
				useSessionPlayer({
					autoplay: true,
					initialManifest: mockManifest,
					vodId: "vod_gm_ana",
				}),
			{ wrapper: createWrapper() },
		);

		act(() => {
			result.current.containerRef(container);
		});
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

		// Assert
		expect(result.current.state).toBe("SCENARIO_ACTIVE");
		expect(result.current.currentScenario?.id).toBe("sc_1");
		expect(result.current.overlayState).toEqual({ status: "unanswered" });
		expect(player.pauseVideo).toHaveBeenCalled();
	});

	it("records attempt and transitions to FEEDBACK when user selects an option", async () => {
		// Arrange
		const frameController = installMockFrames();
		const youtube = createYouTubeMock(600);
		setYouTubeNamespace(youtube.namespace);
		const container = document.createElement("div");

		const { result } = renderHook(
			() =>
				useSessionPlayer({
					autoplay: true,
					initialManifest: mockManifest,
					vodId: "vod_gm_ana",
				}),
			{ wrapper: createWrapper() },
		);

		act(() => {
			result.current.containerRef(container);
		});
		await act(async () => {
			await Promise.resolve();
		});
		const player = youtube.players[0];
		act(() => {
			player.triggerReady();
			player.triggerStateChange(YouTubePlayerState.PLAYING);
		});
		player.getCurrentTime = vi.fn(() => 30.0);
		act(() => {
			frameController.flush();
		});

		// Act: select correct option
		act(() => {
			result.current.selectOption("opt_1a");
		});

		// Assert
		expect(result.current.state).toBe("FEEDBACK");
		expect(result.current.overlayState).toEqual({
			correctOptionId: "opt_1a",
			isCorrect: true,
			selectedOptionId: "opt_1a",
			status: "answered",
		});
		expect(result.current.attempts).toHaveLength(1);
		expect(result.current.attempts[0].isCorrect).toBe(true);
		expect(result.current.attempts[0].moduleType).toBe("STRATEGY");
	});

	it("records incorrect attempt when user selects wrong option", async () => {
		// Arrange
		const frameController = installMockFrames();
		const youtube = createYouTubeMock(600);
		setYouTubeNamespace(youtube.namespace);
		const container = document.createElement("div");

		const { result } = renderHook(
			() =>
				useSessionPlayer({
					autoplay: true,
					initialManifest: mockManifest,
					vodId: "vod_gm_ana",
				}),
			{ wrapper: createWrapper() },
		);

		act(() => {
			result.current.containerRef(container);
		});
		await act(async () => {
			await Promise.resolve();
		});
		const player = youtube.players[0];
		act(() => {
			player.triggerReady();
			player.triggerStateChange(YouTubePlayerState.PLAYING);
		});
		player.getCurrentTime = vi.fn(() => 30.0);
		act(() => {
			frameController.flush();
		});

		// Act: select wrong option
		act(() => {
			result.current.selectOption("opt_1b");
		});

		// Assert
		expect(result.current.state).toBe("FEEDBACK");
		expect(result.current.overlayState).toEqual({
			correctOptionId: "opt_1a",
			isCorrect: false,
			selectedOptionId: "opt_1b",
			status: "answered",
		});
		expect(result.current.attempts).toHaveLength(1);
		expect(result.current.attempts[0].isCorrect).toBe(false);
	});

	it("resumes playback, advances scenario index, and transitions back to PLAYING", async () => {
		// Arrange
		const frameController = installMockFrames();
		const youtube = createYouTubeMock(600);
		setYouTubeNamespace(youtube.namespace);
		const container = document.createElement("div");

		const { result } = renderHook(
			() =>
				useSessionPlayer({
					autoplay: true,
					initialManifest: mockManifest,
					vodId: "vod_gm_ana",
				}),
			{ wrapper: createWrapper() },
		);

		act(() => {
			result.current.containerRef(container);
		});
		await act(async () => {
			await Promise.resolve();
		});
		const player = youtube.players[0];
		act(() => {
			player.triggerReady();
			player.triggerStateChange(YouTubePlayerState.PLAYING);
		});
		player.getCurrentTime = vi.fn(() => 30.0);
		act(() => {
			frameController.flush();
		});
		act(() => {
			result.current.selectOption("opt_1a");
		});

		// Act
		act(() => {
			result.current.resumePlayback();
		});

		// Assert
		expect(result.current.state).toBe("PLAYING");
		expect(result.current.activeScenarioIndex).toBe(1);
		expect(result.current.currentScenario?.id).toBe("sc_2");
		expect(result.current.overlayState).toBeNull();
		expect(player.playVideo).toHaveBeenCalled();
	});

	it("replays context: seeks back 10 seconds, resumes playing, dismisses overlay, and keeps index unchanged", async () => {
		// Arrange
		const frameController = installMockFrames();
		const youtube = createYouTubeMock(600);
		setYouTubeNamespace(youtube.namespace);
		const container = document.createElement("div");

		const { result } = renderHook(
			() =>
				useSessionPlayer({
					autoplay: true,
					initialManifest: mockManifest,
					vodId: "vod_gm_ana",
				}),
			{ wrapper: createWrapper() },
		);

		act(() => {
			result.current.containerRef(container);
		});
		await act(async () => {
			await Promise.resolve();
		});
		const player = youtube.players[0];
		act(() => {
			player.triggerReady();
			player.triggerStateChange(YouTubePlayerState.PLAYING);
		});
		player.getCurrentTime = vi.fn(() => 30.0);
		act(() => {
			frameController.flush();
		});

		// Act: click replay context
		act(() => {
			result.current.replayContext();
		});

		// Assert
		expect(result.current.state).toBe("PLAYING");
		expect(result.current.activeScenarioIndex).toBe(0);
		expect(result.current.overlayState).toBeNull();
		expect(player.seekTo).toHaveBeenCalledWith(20, true);
		expect(player.playVideo).toHaveBeenCalled();
	});

	it("automatically fails scenario when Tactics timer expires and transitions to FEEDBACK", async () => {
		// Arrange
		vi.useFakeTimers();
		const frameController = installMockFrames();
		const youtube = createYouTubeMock(600);
		setYouTubeNamespace(youtube.namespace);
		const container = document.createElement("div");

		const { result } = renderHook(
			() =>
				useSessionPlayer({
					activeModuleKeys: ["TACTICS"],
					autoplay: true,
					initialManifest: mockManifest,
					vodId: "vod_gm_ana",
				}),
			{ wrapper: createWrapper() },
		);

		act(() => {
			result.current.containerRef(container);
		});
		await act(async () => {
			await Promise.resolve();
		});
		const player = youtube.players[0];
		act(() => {
			player.triggerReady();
			player.triggerStateChange(YouTubePlayerState.PLAYING);
		});

		// Reach scenario 2 (Tactics, 60s, 3s limit)
		player.getCurrentTime = vi.fn(() => 60.0);
		act(() => {
			frameController.flush();
		});

		// Assert timer is active
		expect(result.current.state).toBe("SCENARIO_ACTIVE");
		expect(result.current.totalMs).toBe(3000);

		// Act: advance timer past 3000ms
		act(() => {
			vi.advanceTimersByTime(3100);
		});

		// Assert
		expect(result.current.state).toBe("FEEDBACK");
		expect(result.current.overlayState).toEqual({
			correctOptionId: "opt_2a",
			isCorrect: false,
			status: "timedOut",
		});
		expect(result.current.attempts).toHaveLength(1);
		expect(result.current.attempts[0].isCorrect).toBe(false);
		expect(result.current.attempts[0].isTimedOut).toBe(true);
		expect(result.current.attempts[0].responseTimeMs).toBe(3000);
		vi.useRealTimers();
	});

	it("handles timeout when no option is marked correct and scenario has custom limit", async () => {
		// Arrange
		vi.useFakeTimers();
		const frameController = installMockFrames();
		const youtube = createYouTubeMock(600);
		setYouTubeNamespace(youtube.namespace);
		const container = document.createElement("div");

		const customLimitManifest = {
			...mockManifest,
			scenarios: [
				{
					...mockManifest.scenarios[1],
					inputConfig: {
						options: [{ id: "opt_x", text: "X" }],
					},
					timeLimitSeconds: 2,
				},
			],
		};

		const { result } = renderHook(
			() =>
				useSessionPlayer({
					activeModuleKeys: ["TACTICS"],
					autoplay: true,
					initialManifest: customLimitManifest,
					vodId: "vod_gm_ana",
				}),
			{ wrapper: createWrapper() },
		);

		act(() => {
			result.current.containerRef(container);
		});
		await act(async () => {
			await Promise.resolve();
		});
		const player = youtube.players[0];
		act(() => {
			player.triggerReady();
			player.triggerStateChange(YouTubePlayerState.PLAYING);
		});

		player.getCurrentTime = vi.fn(() => 60.0);
		act(() => {
			frameController.flush();
		});

		expect(result.current.totalMs).toBe(2000);

		// Act - advance past 2000ms
		act(() => {
			vi.advanceTimersByTime(2100);
		});

		// Assert
		expect(result.current.state).toBe("FEEDBACK");
		expect(result.current.overlayState?.correctOptionId).toBe("");
		expect(result.current.attempts[0]?.responseTimeMs).toBe(2000);
		vi.useRealTimers();
	});

	it("transitions to COMPLETED on video ENDED status, computes summary report, and fires callback", async () => {
		// Arrange
		const youtube = createYouTubeMock(600);
		setYouTubeNamespace(youtube.namespace);
		const container = document.createElement("div");
		const onSessionComplete = vi.fn();

		const { result } = renderHook(
			() =>
				useSessionPlayer({
					autoplay: true,
					initialManifest: mockManifest,
					onSessionComplete,
					vodId: "vod_gm_ana",
				}),
			{ wrapper: createWrapper() },
		);

		act(() => {
			result.current.containerRef(container);
		});
		await act(async () => {
			await Promise.resolve();
		});
		const player = youtube.players[0];
		act(() => {
			player.triggerReady();
			player.triggerStateChange(YouTubePlayerState.PLAYING);
		});

		// Act: video ends
		act(() => {
			player.triggerStateChange(YouTubePlayerState.ENDED);
		});

		// Assert
		expect(result.current.state).toBe("COMPLETED");
		expect(result.current.summary).toBeDefined();
		expect(result.current.summary?.totalScenarios).toBe(0);
		expect(onSessionComplete).toHaveBeenCalledWith(result.current.summary);
	});

	it("allows user to manually pause and play during video playback", async () => {
		// Arrange
		const youtube = createYouTubeMock(600);
		setYouTubeNamespace(youtube.namespace);
		const container = document.createElement("div");

		const { result } = renderHook(
			() =>
				useSessionPlayer({
					autoplay: true,
					initialManifest: mockManifest,
					vodId: "vod_gm_ana",
				}),
			{ wrapper: createWrapper() },
		);

		act(() => {
			result.current.containerRef(container);
		});
		await act(async () => {
			await Promise.resolve();
		});
		const player = youtube.players[0];
		act(() => {
			player.triggerReady();
			player.triggerStateChange(YouTubePlayerState.PLAYING);
		});

		// Act: manual pause
		act(() => {
			result.current.pause();
		});
		act(() => {
			player.triggerStateChange(YouTubePlayerState.PAUSED);
		});

		// Assert paused
		expect(result.current.state).toBe("PAUSED_USER");

		// Act: manual play
		act(() => {
			result.current.play();
		});
		act(() => {
			player.triggerStateChange(YouTubePlayerState.PLAYING);
		});

		// Assert playing
		expect(result.current.state).toBe("PLAYING");
	});

	it("resets session state on retrySession", async () => {
		// Arrange
		const youtube = createYouTubeMock(600);
		setYouTubeNamespace(youtube.namespace);
		const container = document.createElement("div");

		const { result } = renderHook(
			() =>
				useSessionPlayer({
					autoplay: true,
					initialManifest: mockManifest,
					vodId: "vod_gm_ana",
				}),
			{ wrapper: createWrapper() },
		);

		act(() => {
			result.current.containerRef(container);
		});
		await act(async () => {
			await Promise.resolve();
		});
		const player = youtube.players[0];
		act(() => {
			player.triggerReady();
			player.triggerStateChange(YouTubePlayerState.ENDED);
		});

		// Act: retry
		act(() => {
			result.current.retrySession();
		});

		// Assert
		expect(result.current.state).toBe("PLAYING");
		expect(result.current.activeScenarioIndex).toBe(0);
		expect(result.current.attempts).toHaveLength(0);
		expect(player.seekTo).toHaveBeenCalledWith(0, true);
		expect(player.playVideo).toHaveBeenCalled();
	});

	it("transitions to PAUSED_USER on ready when autoplay is false", async () => {
		// Arrange
		const youtube = createYouTubeMock(600);
		setYouTubeNamespace(youtube.namespace);
		const container = document.createElement("div");

		// Act
		const { result } = renderHook(
			() =>
				useSessionPlayer({
					autoplay: false,
					initialManifest: mockManifest,
					vodId: "vod_gm_ana",
				}),
			{ wrapper: createWrapper() },
		);
		act(() => {
			result.current.containerRef(container);
		});
		await act(async () => {
			await Promise.resolve();
		});
		const player = youtube.players[0];
		act(() => {
			player.triggerReady();
		});

		// Assert
		expect(result.current.state).toBe("PAUSED_USER");
	});

	it("handles null/missing manifest without throwing", () => {
		// Arrange & Act
		const { result } = renderHook(
			() =>
				useSessionPlayer({
					initialManifest: null,
					vodId: "vod_missing",
				}),
			{ wrapper: createWrapper() },
		);

		// Assert
		expect(result.current.vod).toBeNull();
		expect(result.current.activeScenarios).toEqual([]);
		expect(result.current.currentScenario).toBeNull();
	});

	it("safely ignores selectOption, resumePlayback, and replayContext when not in correct state", () => {
		// Arrange
		const { result } = renderHook(
			() =>
				useSessionPlayer({
					initialManifest: mockManifest,
					vodId: "vod_gm_ana",
				}),
			{ wrapper: createWrapper() },
		);

		// Act
		act(() => {
			result.current.selectOption("opt_1a");
			result.current.resumePlayback();
			result.current.replayContext();
		});

		// Assert
		expect(result.current.state).toBe("LOADING");
		expect(result.current.attempts).toHaveLength(0);
	});

	it("navigates to vod detail page on exitSession", () => {
		// Arrange
		const originalLocation = window.location;
		const mockLocation = { href: "" } as Location;
		Object.defineProperty(window, "location", {
			configurable: true,
			value: mockLocation,
			writable: true,
		});

		const { result } = renderHook(
			() =>
				useSessionPlayer({
					initialManifest: mockManifest,
					vodId: "vod_gm_ana",
				}),
			{ wrapper: createWrapper() },
		);

		// Act
		act(() => {
			result.current.exitSession();
		});

		// Assert
		expect(window.location.href).toBe("/vods/vod_gm_ana");

		Object.defineProperty(window, "location", {
			configurable: true,
			value: originalLocation,
		});
	});

	it("safely handles getScenarioOptions with non-object or malformed inputConfig", async () => {
		// Arrange
		const { getScenarioOptions } = await import("../use-session-player");

		// Act & Assert
		expect(getScenarioOptions(null)).toEqual([]);
		expect(getScenarioOptions(undefined)).toEqual([]);
		expect(getScenarioOptions("invalid")).toEqual([]);
		expect(getScenarioOptions({ options: "not-an-array" })).toEqual([]);
		expect(
			getScenarioOptions({
				options: [{ id: "opt_1", text: "Option 1" }],
			}),
		).toEqual([{ id: "opt_1", text: "Option 1" }]);
	});

	it("ignores unhandled status transitions gracefully", () => {
		// Arrange
		const youtube = createYouTubeMock(600);
		setYouTubeNamespace(youtube.namespace);
		const { result } = renderHook(
			() =>
				useSessionPlayer({
					initialManifest: mockManifest,
					vodId: "vod_gm_ana",
				}),
			{ wrapper: createWrapper() },
		);

		// Act - trigger buffering
		act(() => {
			const player = youtube.players[0];
			player?.triggerStateChange(YouTubePlayerState.BUFFERING);
		});

		// Assert - state stays unchanged
		expect(result.current.state).toBe("LOADING");
	});

	it("correctly records attempt when scenario is untimed", async () => {
		// Arrange
		const frameController = installMockFrames();
		const youtube = createYouTubeMock(600);
		setYouTubeNamespace(youtube.namespace);
		const container = document.createElement("div");

		const { result } = renderHook(
			() =>
				useSessionPlayer({
					initialManifest: mockManifest,
					vodId: "vod_gm_ana",
				}),
			{ wrapper: createWrapper() },
		);

		act(() => {
			result.current.containerRef(container);
		});
		await act(async () => {
			await Promise.resolve();
		});

		const player = youtube.players[0];
		act(() => {
			player.triggerReady();
			player.triggerStateChange(YouTubePlayerState.PLAYING);
		});

		// Trigger strategy scenario (sc_1 at 30.0s, totalMs is undefined)
		player.getCurrentTime = vi.fn(() => 30.0);
		act(() => {
			frameController.flush();
		});

		expect(result.current.totalMs).toBeUndefined();

		// Act - select option
		act(() => {
			result.current.selectOption("opt_1a");
		});

		// Assert
		expect(result.current.state).toBe("FEEDBACK");
		expect(result.current.attempts[0]?.isCorrect).toBe(true);
		expect(result.current.attempts[0]?.moduleType).toBe("STRATEGY");
	});

	it("transitions to PAUSED_USER when YouTube player pauses while in PLAYING state", async () => {
		// Arrange
		const youtube = createYouTubeMock(600);
		setYouTubeNamespace(youtube.namespace);
		const container = document.createElement("div");

		const { result } = renderHook(
			() =>
				useSessionPlayer({
					initialManifest: mockManifest,
					vodId: "vod_gm_ana",
				}),
			{ wrapper: createWrapper() },
		);

		act(() => {
			result.current.containerRef(container);
		});
		await act(async () => {
			await Promise.resolve();
		});

		const player = youtube.players[0];
		act(() => {
			player.triggerReady();
			player.triggerStateChange(YouTubePlayerState.PLAYING);
		});

		expect(result.current.state).toBe("PLAYING");

		// Act - trigger pause from YouTube player
		act(() => {
			player.triggerStateChange(YouTubePlayerState.PAUSED);
		});

		// Assert
		expect(result.current.state).toBe("PAUSED_USER");
	});

	it("clamps responseTimeMs to totalMs when answering timed scenario after delay", async () => {
		// Arrange
		const frameController = installMockFrames();
		const youtube = createYouTubeMock(600);
		setYouTubeNamespace(youtube.namespace);
		const container = document.createElement("div");

		const tacticsManifest = {
			...mockManifest,
			scenarios: [mockManifest.scenarios[1]],
		};

		const { result } = renderHook(
			() =>
				useSessionPlayer({
					initialManifest: tacticsManifest,
					vodId: "vod_gm_ana",
				}),
			{ wrapper: createWrapper() },
		);

		act(() => {
			result.current.containerRef(container);
		});
		await act(async () => {
			await Promise.resolve();
		});

		const player = youtube.players[0];
		act(() => {
			player.triggerReady();
			player.triggerStateChange(YouTubePlayerState.PLAYING);
		});

		// Set startTime and elapsed time via Date.now
		const dateSpy = vi.spyOn(Date, "now");
		dateSpy.mockReturnValueOnce(1000);

		// Advance to sc_2 (Tactics, totalMs = 3000)
		player.getCurrentTime = vi.fn(() => 60.0);
		act(() => {
			frameController.flush();
		});

		expect(result.current.totalMs).toBe(3000);

		// When selecting option after 5000ms elapsed
		dateSpy.mockReturnValueOnce(6000);

		// Act - select option
		act(() => {
			result.current.selectOption("opt_2a");
		});

		// Assert
		expect(result.current.state).toBe("FEEDBACK");
		expect(result.current.attempts[0]?.responseTimeMs).toBe(3000);
		dateSpy.mockRestore();
	});

	it("triggers onSessionComplete callback when session transitions to COMPLETED", async () => {
		// Arrange
		const youtube = createYouTubeMock(600);
		setYouTubeNamespace(youtube.namespace);
		const onSessionComplete = vi.fn();
		const container = document.createElement("div");

		const { result } = renderHook(
			() =>
				useSessionPlayer({
					initialManifest: mockManifest,
					onSessionComplete,
					vodId: "vod_gm_ana",
				}),
			{ wrapper: createWrapper() },
		);

		act(() => {
			result.current.containerRef(container);
		});
		await act(async () => {
			await Promise.resolve();
		});

		const player = youtube.players[0];
		act(() => {
			player.triggerReady();
			player.triggerStateChange(YouTubePlayerState.PLAYING);
		});

		// Act - trigger ENDED state
		act(() => {
			player.triggerStateChange(YouTubePlayerState.ENDED);
		});

		// Assert
		expect(result.current.state).toBe("COMPLETED");
		expect(onSessionComplete).toHaveBeenCalledWith(
			expect.objectContaining({ totalScenarios: 0 }),
		);
	});

	it("guards against replayContext, resumePlayback, and selectOption in invalid states", async () => {
		// Arrange
		const { result } = renderHook(
			() =>
				useSessionPlayer({
					initialManifest: mockManifest,
					vodId: "vod_gm_ana",
				}),
			{ wrapper: createWrapper() },
		);

		// Act - call while in LOADING state
		act(() => {
			result.current.replayContext();
			result.current.resumePlayback();
			result.current.selectOption("opt_1a");
		});

		// Assert - state is unchanged
		expect(result.current.state).toBe("LOADING");
	});

	it("defaults Tactics scenarios to 3s limit when timeLimitSeconds is null", async () => {
		// Arrange
		const frameController = installMockFrames();
		const youtube = createYouTubeMock(600);
		setYouTubeNamespace(youtube.namespace);
		const container = document.createElement("div");

		const tacticsWithoutLimit = {
			...mockManifest,
			scenarios: [
				{
					...mockManifest.scenarios[1],
					timeLimitSeconds: null,
				},
			],
		};

		const { result } = renderHook(
			() =>
				useSessionPlayer({
					initialManifest: tacticsWithoutLimit,
					vodId: "vod_gm_ana",
				}),
			{ wrapper: createWrapper() },
		);

		act(() => {
			result.current.containerRef(container);
		});
		await act(async () => {
			await Promise.resolve();
		});

		const player = youtube.players[0];
		act(() => {
			player.triggerReady();
			player.triggerStateChange(YouTubePlayerState.PLAYING);
		});

		player.getCurrentTime = vi.fn(() => 60.0);
		act(() => {
			frameController.flush();
		});

		// Assert
		expect(result.current.totalMs).toBe(3000);
	});

	it("handles selectOption with non-matching optionId or missing correct option", async () => {
		// Arrange
		const frameController = installMockFrames();
		const youtube = createYouTubeMock(600);
		setYouTubeNamespace(youtube.namespace);
		const container = document.createElement("div");

		const noCorrectManifest = {
			...mockManifest,
			scenarios: [
				{
					...mockManifest.scenarios[0],
					inputConfig: {
						options: [
							{ id: "opt_x", text: "Option X" },
							{ id: "opt_y", text: "Option Y" },
						],
					},
				},
			],
		};

		const { result } = renderHook(
			() =>
				useSessionPlayer({
					initialManifest: noCorrectManifest,
					vodId: "vod_gm_ana",
				}),
			{ wrapper: createWrapper() },
		);

		act(() => {
			result.current.containerRef(container);
		});
		await act(async () => {
			await Promise.resolve();
		});

		const player = youtube.players[0];
		act(() => {
			player.triggerReady();
			player.triggerStateChange(YouTubePlayerState.PLAYING);
		});

		player.getCurrentTime = vi.fn(() => 30.0);
		act(() => {
			frameController.flush();
		});

		// Act: select unknown option id
		act(() => {
			result.current.selectOption("unknown_opt");
		});

		// Assert
		expect(result.current.state).toBe("FEEDBACK");
		expect(result.current.attempts[0]?.isCorrect).toBe(false);
		expect(result.current.overlayState?.correctOptionId).toBe("");
	});

	it("ignores onReady when player is not in LOADING state", async () => {
		// Arrange
		const youtube = createYouTubeMock(600);
		setYouTubeNamespace(youtube.namespace);
		const container = document.createElement("div");

		const { result } = renderHook(
			() =>
				useSessionPlayer({
					initialManifest: mockManifest,
					vodId: "vod_gm_ana",
				}),
			{ wrapper: createWrapper() },
		);

		act(() => {
			result.current.containerRef(container);
		});
		await act(async () => {
			await Promise.resolve();
		});

		const player = youtube.players[0];
		act(() => {
			player.triggerReady();
			player.triggerStateChange(YouTubePlayerState.PLAYING);
		});

		// Act - trigger onReady second time while in PLAYING
		act(() => {
			player.triggerReady();
		});

		// Assert - state stays PLAYING
		expect(result.current.state).toBe("PLAYING");
	});

	it("handles unhandled status transition when player is mounted", async () => {
		// Arrange
		const youtube = createYouTubeMock(600);
		setYouTubeNamespace(youtube.namespace);
		const container = document.createElement("div");

		const { result } = renderHook(
			() =>
				useSessionPlayer({
					initialManifest: mockManifest,
					vodId: "vod_gm_ana",
				}),
			{ wrapper: createWrapper() },
		);

		act(() => {
			result.current.containerRef(container);
		});
		await act(async () => {
			await Promise.resolve();
		});
		const player = youtube.players[0];
		act(() => {
			player.triggerReady();
			player.triggerStateChange(YouTubePlayerState.PLAYING);
		});

		// Act - trigger BUFFERING status
		act(() => {
			player.triggerStateChange(YouTubePlayerState.BUFFERING);
		});

		// Assert - state is still PLAYING
		expect(result.current.state).toBe("PLAYING");
	});

	it("correctly identifies option correctness with findCorrectOptionId and isSelectedOptionCorrect", () => {
		// Arrange
		const options = [
			{ id: "opt_1", is_correct: false, text: "A" },
			{ id: "opt_2", is_correct: true, text: "B" },
		];

		// Act & Assert
		expect(findCorrectOptionId(options)).toBe("opt_2");
		expect(findCorrectOptionId([{ id: "opt_x", text: "X" }])).toBe("");
		expect(isSelectedOptionCorrect(options, "opt_2")).toBe(true);
		expect(isSelectedOptionCorrect(options, "opt_1")).toBe(false);
		expect(isSelectedOptionCorrect(options, "opt_nonexistent")).toBe(false);
	});

	it("correctly resolves playback status state transitions", () => {
		// Act & Assert
		expect(resolveNewStatusState("LOADING", PlaybackStatus.PLAYING)).toBe(
			"PLAYING",
		);
		expect(resolveNewStatusState("PAUSED_USER", PlaybackStatus.PLAYING)).toBe(
			"PLAYING",
		);
		expect(resolveNewStatusState("PLAYING", PlaybackStatus.PAUSED)).toBe(
			"PAUSED_USER",
		);
		expect(resolveNewStatusState("PLAYING", PlaybackStatus.ENDED)).toBe(
			"COMPLETED",
		);
		expect(
			resolveNewStatusState("PLAYING", PlaybackStatus.BUFFERING),
		).toBeNull();
		expect(
			resolveNewStatusState("PAUSED_USER", PlaybackStatus.PAUSED),
		).toBeNull();
	});
});
