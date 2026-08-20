import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type {
	PlayerHistoryItem,
	PlayerHistoryResult,
	PublishedVodItem,
} from "@/shared/db";
import { HistoryPage } from "../history-page";

vi.mock("@tanstack/react-router");

const mockVod: PublishedVodItem = {
	createdAt: new Date("2026-01-01"),
	durationSeconds: 1200,
	heroName: "Ana",
	id: "vod_1",
	isPublished: true,
	mapName: "King's Row",
	rankTier: "Grandmaster",
	role: "SUPPORT",
	scenarios: [],
	title: "GM Ana Gameplay",
	youtubeVideoId: "yt123",
};

const mockCompletedPlaythrough: PlayerHistoryItem = {
	accuracy: 75,
	attempts: [
		{
			id: "a1",
			inputValue: null,
			isCorrect: true,
			isTimedOut: false,
			responseTimeMs: 1200,
			scenarioSnapshotId: "s1",
			selectedOptionId: "opt_1",
		},
		{
			id: "a2",
			inputValue: null,
			isCorrect: false,
			isTimedOut: false,
			responseTimeMs: 1600,
			scenarioSnapshotId: "s2",
			selectedOptionId: "opt_2",
		},
	],
	completedAt: new Date("2026-01-15T14:30:00.000Z"),
	completion: {
		completedAt: new Date("2026-01-15T14:30:00.000Z"),
		id: "comp_1",
	},
	createdAt: new Date("2026-01-15T14:00:00.000Z"),
	id: "playthrough_comp_1",
	medianLatencyMs: 1400,
	moduleSelections: [{ moduleType: "STRATEGY" }, { moduleType: "TACTICS" }],
	scenarioSnapshots: [
		{
			explanationText: "Take high ground",
			id: "s1",
			imageUrl: null,
			inputConfig: {},
			inputType: "MULTIPLE_CHOICE",
			moduleType: "STRATEGY",
			position: 0,
			promptText: "Positioning question",
			scenarioId: "scen_1",
			timeLimitSeconds: 15,
			timestampSeconds: 60,
		},
		{
			explanationText: "Track cooldown",
			id: "s2",
			imageUrl: null,
			inputConfig: {},
			inputType: "MULTIPLE_CHOICE",
			moduleType: "TACTICS",
			position: 1,
			promptText: "Tactics question",
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

const mockInProgressPlaythrough: PlayerHistoryItem = {
	accuracy: 50,
	attempts: [],
	completedAt: null,
	completion: null,
	createdAt: new Date("2026-01-16T10:00:00.000Z"),
	id: "playthrough_in_prog_1",
	medianLatencyMs: null,
	moduleSelections: [{ moduleType: "ULTIMATE" }],
	scenarioSnapshots: [],
	status: "IN_PROGRESS",
	userId: "player_1",
	vod: {
		durationSeconds: 900,
		id: "vod_2",
		mapName: "Ilios",
		rankTier: "Master",
		title: "Master Kiriko Play",
		youtubeVideoId: "yt456",
	},
	vodId: "vod_2",
};

describe("HistoryPage component", () => {
	it("renders heading, navigation header, and account controls", () => {
		// Arrange & Act
		render(
			<HistoryPage
				data={{
					items: [],
					page: 1,
					pageSize: 10,
					total: 0,
					totalPages: 1,
				}}
				vods={[mockVod]}
			/>,
		);

		// Assert
		expect(
			screen.getByRole("heading", { name: "Training History" }),
		).toBeDefined();
		expect(screen.getByRole("button", { name: "Sign in" })).toBeDefined();
	});

	it("renders populated completed playthrough items with metrics and review link", () => {
		// Arrange
		const data: PlayerHistoryResult = {
			items: [mockCompletedPlaythrough],
			page: 1,
			pageSize: 10,
			total: 1,
			totalPages: 1,
		};

		// Act
		render(<HistoryPage data={data} vods={[mockVod]} />);

		// Assert
		expect(screen.getByText("GM Ana Gameplay")).toBeDefined();
		expect(screen.getByText("King's Row")).toBeDefined();
		expect(screen.getByText("75%")).toBeDefined();
		expect(screen.getByText("1,400 ms")).toBeDefined();
		expect(screen.getAllByText("Strategy").length).toBeGreaterThanOrEqual(1);
		expect(screen.getAllByText("Tactics").length).toBeGreaterThanOrEqual(1);
		expect(screen.getByRole("link", { name: /review details/i })).toBeDefined();
	});

	it("renders in-progress playthroughs with re-enter action", () => {
		// Arrange
		const data: PlayerHistoryResult = {
			items: [mockInProgressPlaythrough],
			page: 1,
			pageSize: 10,
			total: 1,
			totalPages: 1,
		};

		// Act
		render(
			<HistoryPage
				data={data}
				searchParams={{ status: "IN_PROGRESS" }}
				vods={[mockVod]}
			/>,
		);

		// Assert
		expect(screen.getByText("Master Kiriko Play")).toBeDefined();
		expect(screen.getByText("Ilios")).toBeDefined();
		expect(
			screen.getByRole("link", { name: /continue training/i }),
		).toBeDefined();
	});

	it("renders empty state when no history exists", () => {
		// Arrange
		const data: PlayerHistoryResult = {
			items: [],
			page: 1,
			pageSize: 10,
			total: 0,
			totalPages: 1,
		};

		// Act
		render(<HistoryPage data={data} vods={[]} />);

		// Assert
		expect(
			screen.getByText(/no completed training sessions yet/i),
		).toBeDefined();
		expect(
			screen.getByRole("link", { name: /browse training vods/i }),
		).toBeDefined();
	});

	it("renders empty state for in-progress tab when none exist", () => {
		// Arrange
		const data: PlayerHistoryResult = {
			items: [],
			page: 1,
			pageSize: 10,
			total: 0,
			totalPages: 1,
		};

		// Act
		render(
			<HistoryPage
				data={data}
				searchParams={{ status: "IN_PROGRESS" }}
				vods={[]}
			/>,
		);

		// Assert
		expect(screen.getByText(/no in-progress training sessions/i)).toBeDefined();
	});

	it("triggers filter changes when status tab, vod, or module chip is clicked", () => {
		// Arrange
		const onFilterChange = vi.fn();
		const data: PlayerHistoryResult = {
			items: [],
			page: 1,
			pageSize: 10,
			total: 0,
			totalPages: 1,
		};

		// Act
		render(
			<HistoryPage
				data={data}
				onFilterChange={onFilterChange}
				vods={[mockVod]}
			/>,
		);

		// Click In Progress Tab
		fireEvent.click(screen.getByRole("tab", { name: /in progress/i }));
		expect(onFilterChange).toHaveBeenCalledWith(
			expect.objectContaining({ page: 1, status: "IN_PROGRESS" }),
		);

		// Click Completed Tab
		fireEvent.click(screen.getByRole("tab", { name: /^completed$/i }));
		expect(onFilterChange).toHaveBeenCalledWith(
			expect.objectContaining({ page: 1, status: "COMPLETED" }),
		);

		// Select VOD Filter
		const select = screen.getByRole("combobox", { name: /filter by vod/i });
		fireEvent.change(select, { target: { value: "vod_1" } });
		expect(onFilterChange).toHaveBeenCalledWith(
			expect.objectContaining({ page: 1, vodId: "vod_1" }),
		);

		// Toggle Module Chip (Select)
		fireEvent.click(screen.getByRole("button", { name: /toggle strategy/i }));
		expect(onFilterChange).toHaveBeenCalledWith(
			expect.objectContaining({ modules: ["STRATEGY"], page: 1 }),
		);
	});

	it("handles deselecting an active module chip and clearing vod selection", () => {
		// Arrange
		const onFilterChange = vi.fn();
		const data: PlayerHistoryResult = {
			items: [],
			page: 1,
			pageSize: 10,
			total: 0,
			totalPages: 1,
		};

		// Act
		render(
			<HistoryPage
				data={data}
				onFilterChange={onFilterChange}
				searchParams={{ modules: ["STRATEGY", "TACTICS"], vodId: "vod_1" }}
				vods={[mockVod]}
			/>,
		);

		// Deselect Strategy
		fireEvent.click(screen.getByRole("button", { name: /toggle strategy/i }));
		expect(onFilterChange).toHaveBeenCalledWith(
			expect.objectContaining({ modules: ["TACTICS"], page: 1 }),
		);

		// Deselect sole remaining module to set modules to undefined
		const { unmount } = render(
			<HistoryPage
				data={data}
				onFilterChange={onFilterChange}
				searchParams={{ modules: ["STRATEGY"] }}
				vods={[mockVod]}
			/>,
		);
		fireEvent.click(
			screen.getAllByRole("button", { name: /toggle strategy/i })[1],
		);
		expect(onFilterChange).toHaveBeenCalledWith(
			expect.objectContaining({ modules: undefined, page: 1 }),
		);
		unmount();

		// Clear VOD
		const select = screen.getByRole("combobox", { name: /filter by vod/i });
		fireEvent.change(select, { target: { value: "" } });
		expect(onFilterChange).toHaveBeenCalledWith(
			expect.objectContaining({ page: 1, vodId: undefined }),
		);
	});

	it("handles pagination next and previous clicks", () => {
		// Arrange
		const onFilterChange = vi.fn();
		const data: PlayerHistoryResult = {
			items: [mockCompletedPlaythrough],
			page: 2,
			pageSize: 10,
			total: 25,
			totalPages: 3,
		};

		// Act
		render(
			<HistoryPage
				data={data}
				onFilterChange={onFilterChange}
				searchParams={{ page: 2 }}
				vods={[mockVod]}
			/>,
		);

		// Click Previous
		fireEvent.click(screen.getByRole("button", { name: /previous/i }));
		expect(onFilterChange).toHaveBeenCalledWith(
			expect.objectContaining({ page: 1 }),
		);

		// Click Next
		fireEvent.click(screen.getByRole("button", { name: /next/i }));
		expect(onFilterChange).toHaveBeenCalledWith(
			expect.objectContaining({ page: 3 }),
		);
	});

	it("renders loading skeletons when isLoading is true", () => {
		// Arrange & Act
		render(<HistoryPage isLoading={true} />);

		// Assert
		expect(screen.getByLabelText("Loading training history")).toBeDefined();
	});

	it("renders error state with retry button", () => {
		// Arrange
		const onRetry = vi.fn();

		// Act
		render(<HistoryPage error="Network error" onRetry={onRetry} />);

		// Assert
		expect(screen.getByText("Network error")).toBeDefined();
		fireEvent.click(screen.getByRole("button", { name: /retry/i }));
		expect(onRetry).toHaveBeenCalledTimes(1);
	});

	it("renders error state without retry button when onRetry is omitted", () => {
		// Arrange & Act
		render(<HistoryPage error="Fatal network failure" />);

		// Assert
		expect(screen.getByText("Fatal network failure")).toBeDefined();
		expect(screen.queryByRole("button", { name: /retry/i })).toBeNull();
	});

	it("renders playthrough card with fallback labels when vod metadata is undefined", () => {
		// Arrange
		const itemWithoutVod: PlayerHistoryItem = {
			...mockCompletedPlaythrough,
			vod: undefined,
		};
		const data: PlayerHistoryResult = {
			items: [itemWithoutVod],
			page: 1,
			pageSize: 10,
			total: 1,
			totalPages: 1,
		};

		// Act
		render(<HistoryPage data={data} vods={[]} />);

		// Assert
		expect(screen.getByText("Unknown Map")).toBeDefined();
		expect(screen.getByText("Rank")).toBeDefined();
		expect(screen.getByText("VOD Training Session")).toBeDefined();
	});
});
