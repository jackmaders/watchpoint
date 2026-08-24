import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { PlayerHistoryItem } from "@/shared/db";
import { HistoryIdPage } from "../history-id-page";

vi.mock("@tanstack/react-router");

const mockDetailPlaythrough: PlayerHistoryItem = {
	accuracy: 50,
	attempts: [
		{
			id: "a1",
			inputValue: null,
			isCorrect: true,
			isTimedOut: false,
			responseTimeMs: 1100,
			scenarioSnapshotId: "s1",
			selectedOptionId: "opt_1",
		},
		{
			id: "a2",
			inputValue: null,
			isCorrect: false,
			isTimedOut: false,
			responseTimeMs: 3000,
			scenarioSnapshotId: "s2",
			selectedOptionId: "opt_4",
		},
	],
	completedAt: new Date("2026-01-15T14:30:00.000Z"),
	completion: {
		completedAt: new Date("2026-01-15T14:30:00.000Z"),
		id: "comp_1",
	},
	createdAt: new Date("2026-01-15T14:00:00.000Z"),
	id: "playthrough_1",
	medianLatencyMs: 1100,
	moduleSelections: [{ moduleType: "STRATEGY" }, { moduleType: "TACTICS" }],
	scenarioSnapshots: [
		{
			explanationText: "Hold high ground for cover.",
			id: "s1",
			imageUrl: null,
			inputConfig: {
				options: [
					{ id: "opt_1", isCorrect: true, label: "High ground" },
					{ id: "opt_2", isCorrect: false, label: "Low ground" },
				],
			},
			inputType: "MULTIPLE_CHOICE",
			moduleType: "STRATEGY",
			position: 0,
			promptText: "Where should you position?",
			scenarioId: "scen_1",
			timeLimitSeconds: 15,
			timestampSeconds: 60,
		},
		{
			explanationText: "Sleep dart is on 14s cooldown.",
			id: "s2",
			imageUrl: null,
			inputConfig: {
				options: [
					{ id: "opt_3", isCorrect: true, label: "Yes" },
					{ id: "opt_4", isCorrect: false, label: "No" },
				],
			},
			inputType: "MULTIPLE_CHOICE",
			moduleType: "TACTICS",
			position: 1,
			promptText: "Is sleep dart available?",
			scenarioId: "scen_2",
			timeLimitSeconds: 3,
			timestampSeconds: 120,
		},
	],
	status: "COMPLETED",
	userId: "player_1",
	vod: {
		durationSeconds: 1200,
		id: "vod_1",
		mapName: "King's Row",
		rankTier: "Grandmaster",
		title: "GM Ana Gameplay",
		youtubeVideoId: "yt123",
	},
	vodId: "vod_1",
};

describe("HistoryIdPage component", () => {
	it("renders not found state when playthrough is null", () => {
		// Arrange & Act
		render(<HistoryIdPage playthrough={null} />);

		// Assert
		expect(
			screen.getByRole("heading", { name: /training session not found/i }),
		).toBeDefined();
		expect(
			screen.getByRole("link", { name: /return to history/i }),
		).toBeDefined();
	});

	it("renders playthrough details, metrics, and scenario snapshots breakdown", () => {
		// Arrange & Act
		render(<HistoryIdPage playthrough={mockDetailPlaythrough} />);

		// Assert
		expect(screen.getByText("GM Ana Gameplay")).toBeDefined();
		expect(screen.getByText("King's Row")).toBeDefined();
		expect(screen.getByText("50%")).toBeDefined();
		expect(screen.getAllByText("1,100 ms").length).toBeGreaterThanOrEqual(1);
		expect(screen.getByText("Where should you position?")).toBeDefined();
		expect(screen.getByText("Hold high ground for cover.")).toBeDefined();
		expect(screen.getByText("Is sleep dart available?")).toBeDefined();
		expect(screen.getByText("Sleep dart is on 14s cooldown.")).toBeDefined();
		expect(screen.getByText("Correct")).toBeDefined();
		expect(screen.getByText("Incorrect")).toBeDefined();
	});

	it("renders loading skeletons when isLoading is true", () => {
		// Arrange & Act
		render(<HistoryIdPage isLoading={true} />);

		// Assert
		expect(screen.getByLabelText("Loading session details")).toBeDefined();
	});

	it("renders error state with retry button", () => {
		// Arrange
		const onRetry = vi.fn();

		// Act
		render(
			<HistoryIdPage
				error="Unable to fetch session details"
				onRetry={onRetry}
			/>,
		);

		// Assert
		expect(screen.getByText("Unable to fetch session details")).toBeDefined();
		fireEvent.click(screen.getByRole("button", { name: /retry/i }));
		expect(onRetry).toHaveBeenCalledTimes(1);
	});

	it("renders in-progress playthrough details and handles timed out attempt and unanswered snapshot", () => {
		// Arrange
		const inProgressItem: PlayerHistoryItem = {
			accuracy: 0,
			attempts: [
				{
					id: "a1",
					inputValue: null,
					isCorrect: false,
					isTimedOut: true,
					responseTimeMs: 5000,
					scenarioSnapshotId: "s1",
					selectedOptionId: null,
				},
			],
			completedAt: null,
			completion: null,
			createdAt: new Date("2026-01-20T10:00:00.000Z"),
			id: "run_in_prog",
			medianLatencyMs: null,
			moduleSelections: [{ moduleType: "COOLDOWN" }],
			scenarioSnapshots: [
				{
					explanationText: "Timed out before responding",
					id: "s1",
					imageUrl: null,
					inputConfig: {},
					inputType: "MULTIPLE_CHOICE",
					moduleType: "COOLDOWN",
					position: 0,
					promptText: "Is Suzu ready?",
					scenarioId: "scen_10",
					timeLimitSeconds: 5,
					timestampSeconds: 30,
				},
				{
					explanationText: "Did not answer",
					id: "s2",
					imageUrl: null,
					inputConfig: {},
					inputType: "MULTIPLE_CHOICE",
					moduleType: "COOLDOWN",
					position: 1,
					promptText: "Is immortality ready?",
					scenarioId: "scen_11",
					timeLimitSeconds: 5,
					timestampSeconds: 60,
				},
			],
			status: "IN_PROGRESS",
			userId: "player_1",
			vod: {
				durationSeconds: 600,
				id: "vod_3",
				mapName: "Dorado",
				rankTier: "Diamond",
				title: "Diamond Support",
				youtubeVideoId: "yt789",
			},
			vodId: "vod_3",
		};

		// Act
		render(<HistoryIdPage playthrough={inProgressItem} />);

		// Assert
		expect(screen.getAllByText("In Progress").length).toBeGreaterThanOrEqual(1);
		expect(screen.getByText("Timed Out")).toBeDefined();
		expect(screen.getByText("Unanswered")).toBeDefined();
	});

	it("renders error state without retry button when onRetry is omitted", () => {
		// Arrange & Act
		render(<HistoryIdPage error="Fatal network failure" />);

		// Assert
		expect(screen.getByText("Fatal network failure")).toBeDefined();
		expect(screen.queryByRole("button", { name: /retry/i })).toBeNull();
	});

	it("renders header with fallback labels when vod metadata is undefined", () => {
		// Arrange
		const itemWithoutVod: PlayerHistoryItem = {
			...mockDetailPlaythrough,
			vod: undefined,
		};

		// Act
		render(<HistoryIdPage playthrough={itemWithoutVod} />);

		// Assert
		expect(screen.getByText("Unknown Map")).toBeDefined();
		expect(screen.getByText("Rank")).toBeDefined();
		expect(
			screen.getByRole("heading", { name: "VOD Training Session" }),
		).toBeDefined();
	});
});
