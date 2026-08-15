import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { SessionSummaryReport } from "../../model/summary";
import { SessionSummaryPanel } from "../session-summary-panel";

describe("SessionSummaryPanel", () => {
	const mockSummary: SessionSummaryReport = {
		accuracyPercentage: 80,
		averageLatencyMs: 1450,
		correctCount: 4,
		moduleBreakdown: {
			COOLDOWN: {
				accuracyPercentage: 0,
				averageLatencyMs: 0,
				correct: 0,
				total: 0,
			},
			SPATIAL: {
				accuracyPercentage: 0,
				averageLatencyMs: 0,
				correct: 0,
				total: 0,
			},
			STRATEGY: {
				accuracyPercentage: 100,
				averageLatencyMs: 2100,
				correct: 2,
				total: 2,
			},
			TACTICS: {
				accuracyPercentage: 67,
				averageLatencyMs: 1100,
				correct: 2,
				total: 3,
			},
			ULTIMATE: {
				accuracyPercentage: 0,
				averageLatencyMs: 0,
				correct: 0,
				total: 0,
			},
		},
		totalScenarios: 5,
	};

	it("renders session overview metrics and grade badge with accessible container focus", () => {
		// Arrange
		const handleRetry = vi.fn();
		const handleExit = vi.fn();

		// Act
		render(
			<SessionSummaryPanel
				onExit={handleExit}
				onRetry={handleRetry}
				summary={mockSummary}
			/>,
		);
		const region = screen.getByRole("region", { name: /performance summary/i });

		// Assert
		expect(region).toBeDefined();
		expect(region.getAttribute("aria-live")).toBe("polite");
		expect(document.activeElement).toBe(region);
		expect(screen.getByText("80%")).toBeDefined();
		expect(screen.getByText("4 / 5 Correct")).toBeDefined();
		expect(screen.getByText("1450 ms")).toBeDefined();
		expect(screen.getByText("Master")).toBeDefined();
	});

	it("renders module breakdown cards for each attempted module", () => {
		// Arrange
		const handleRetry = vi.fn();
		const handleExit = vi.fn();

		// Act
		render(
			<SessionSummaryPanel
				onExit={handleExit}
				onRetry={handleRetry}
				summary={mockSummary}
			/>,
		);

		// Assert
		expect(screen.getByTestId("module-summary-STRATEGY")).toBeDefined();
		expect(screen.getByTestId("module-summary-TACTICS")).toBeDefined();
		expect(screen.queryByTestId("module-summary-ULTIMATE")).toBeNull();
		expect(screen.getByText("Strategy")).toBeDefined();
		expect(screen.getByText("Tactics")).toBeDefined();
		expect(screen.getByText("2 / 2 (100%)")).toBeDefined();
		expect(screen.getByText("2 / 3 (67%)")).toBeDefined();
		expect(screen.getByText("2100 ms avg")).toBeDefined();
		expect(screen.getByText("1100 ms avg")).toBeDefined();
	});

	it("renders fallback message when no module breakdown data is present", () => {
		// Arrange
		const emptySummary: SessionSummaryReport = {
			accuracyPercentage: 0,
			averageLatencyMs: 0,
			correctCount: 0,
			moduleBreakdown: {
				COOLDOWN: {
					accuracyPercentage: 0,
					averageLatencyMs: 0,
					correct: 0,
					total: 0,
				},
				SPATIAL: {
					accuracyPercentage: 0,
					averageLatencyMs: 0,
					correct: 0,
					total: 0,
				},
				STRATEGY: {
					accuracyPercentage: 0,
					averageLatencyMs: 0,
					correct: 0,
					total: 0,
				},
				TACTICS: {
					accuracyPercentage: 0,
					averageLatencyMs: 0,
					correct: 0,
					total: 0,
				},
				ULTIMATE: {
					accuracyPercentage: 0,
					averageLatencyMs: 0,
					correct: 0,
					total: 0,
				},
			},
			totalScenarios: 0,
		};
		const handleRetry = vi.fn();
		const handleExit = vi.fn();

		// Act
		render(
			<SessionSummaryPanel
				onExit={handleExit}
				onRetry={handleRetry}
				summary={emptySummary}
			/>,
		);

		// Assert
		expect(screen.getByText("0%")).toBeDefined();
		expect(screen.getByText("0 / 0 Correct")).toBeDefined();
		expect(screen.getByText("No scenario breakdown available")).toBeDefined();
		expect(screen.getByText("Needs Practice")).toBeDefined();
	});

	it("triggers onRetry callback when clicking Retry Training Session button", () => {
		// Arrange
		const handleRetry = vi.fn();
		const handleExit = vi.fn();
		render(
			<SessionSummaryPanel
				onExit={handleExit}
				onRetry={handleRetry}
				summary={mockSummary}
			/>,
		);

		// Act
		const retryBtn = screen.getByRole("button", {
			name: /retry training session/i,
		});
		fireEvent.click(retryBtn);

		// Assert
		expect(handleRetry).toHaveBeenCalledTimes(1);
		expect(handleExit).not.toHaveBeenCalled();
	});

	it("triggers onExit callback when clicking Return to VOD button", () => {
		// Arrange
		const handleRetry = vi.fn();
		const handleExit = vi.fn();
		render(
			<SessionSummaryPanel
				onExit={handleExit}
				onRetry={handleRetry}
				summary={mockSummary}
			/>,
		);

		// Act
		const exitBtn = screen.getByRole("button", {
			name: /return to vod/i,
		});
		fireEvent.click(exitBtn);

		// Assert
		expect(handleExit).toHaveBeenCalledTimes(1);
		expect(handleRetry).not.toHaveBeenCalled();
	});

	it("renders Grandmaster badge for >= 90% accuracy", () => {
		// Arrange
		const gmSummary: SessionSummaryReport = {
			accuracyPercentage: 95,
			averageLatencyMs: 800,
			correctCount: 19,
			moduleBreakdown: mockSummary.moduleBreakdown,
			totalScenarios: 20,
		};

		// Act
		render(
			<SessionSummaryPanel
				onExit={vi.fn()}
				onRetry={vi.fn()}
				summary={gmSummary}
			/>,
		);

		// Assert
		expect(screen.getByText("Grandmaster")).toBeDefined();
	});

	it("renders Diamond badge for 60-74% accuracy", () => {
		// Arrange
		const diamondSummary: SessionSummaryReport = {
			accuracyPercentage: 65,
			averageLatencyMs: 1200,
			correctCount: 13,
			moduleBreakdown: mockSummary.moduleBreakdown,
			totalScenarios: 20,
		};

		// Act
		render(
			<SessionSummaryPanel
				onExit={vi.fn()}
				onRetry={vi.fn()}
				summary={diamondSummary}
			/>,
		);

		// Assert
		expect(screen.getByText("Diamond")).toBeDefined();
	});

	it("renders Platinum badge for 40-59% accuracy", () => {
		// Arrange
		const platSummary: SessionSummaryReport = {
			accuracyPercentage: 50,
			averageLatencyMs: 1500,
			correctCount: 10,
			moduleBreakdown: mockSummary.moduleBreakdown,
			totalScenarios: 20,
		};

		// Act
		render(
			<SessionSummaryPanel
				onExit={vi.fn()}
				onRetry={vi.fn()}
				summary={platSummary}
			/>,
		);

		// Assert
		expect(screen.getByText("Platinum")).toBeDefined();
	});
});
