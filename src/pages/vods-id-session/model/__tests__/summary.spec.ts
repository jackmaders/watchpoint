import { describe, expect, it } from "vitest";
import { calculateSessionSummary, type SessionAttempt } from "../summary";

describe("calculateSessionSummary", () => {
	it("returns zeroed summary report for empty attempts array with all module breakdown keys initialized", () => {
		// Arrange
		const attempts: SessionAttempt[] = [];

		// Act
		const summary = calculateSessionSummary(attempts);

		// Assert
		expect(summary.totalScenarios).toBe(0);
		expect(summary.correctCount).toBe(0);
		expect(summary.accuracyPercentage).toBe(0);
		expect(summary.averageLatencyMs).toBe(0);
		expect(summary.moduleBreakdown.TACTICS).toEqual({
			accuracyPercentage: 0,
			averageLatencyMs: 0,
			correct: 0,
			total: 0,
		});
		expect(summary.moduleBreakdown.STRATEGY).toEqual({
			accuracyPercentage: 0,
			averageLatencyMs: 0,
			correct: 0,
			total: 0,
		});
		expect(summary.moduleBreakdown.ULTIMATE).toEqual({
			accuracyPercentage: 0,
			averageLatencyMs: 0,
			correct: 0,
			total: 0,
		});
		expect(summary.moduleBreakdown.COOLDOWN).toEqual({
			accuracyPercentage: 0,
			averageLatencyMs: 0,
			correct: 0,
			total: 0,
		});
		expect(summary.moduleBreakdown.SPATIAL).toEqual({
			accuracyPercentage: 0,
			averageLatencyMs: 0,
			correct: 0,
			total: 0,
		});
	});

	it("calculates 100% accuracy for all-correct single-module attempts", () => {
		// Arrange
		const attempts: SessionAttempt[] = [
			{
				isCorrect: true,
				moduleType: "TACTICS",
				responseTimeMs: 1200,
				scenarioId: "sc_1",
			},
			{
				isCorrect: true,
				moduleType: "TACTICS",
				responseTimeMs: 1400,
				scenarioId: "sc_2",
			},
		];

		// Act
		const summary = calculateSessionSummary(attempts);

		// Assert
		expect(summary.totalScenarios).toBe(2);
		expect(summary.correctCount).toBe(2);
		expect(summary.accuracyPercentage).toBe(100);
		expect(summary.averageLatencyMs).toBe(1300);
		expect(summary.moduleBreakdown.TACTICS).toEqual({
			accuracyPercentage: 100,
			averageLatencyMs: 1300,
			correct: 2,
			total: 2,
		});
		expect(summary.moduleBreakdown.STRATEGY).toEqual({
			accuracyPercentage: 0,
			averageLatencyMs: 0,
			correct: 0,
			total: 0,
		});
	});

	it("calculates 0% accuracy for all-incorrect single-module attempts", () => {
		// Arrange
		const attempts: SessionAttempt[] = [
			{
				isCorrect: false,
				moduleType: "STRATEGY",
				responseTimeMs: 2500,
				scenarioId: "sc_1",
			},
			{
				isCorrect: false,
				moduleType: "STRATEGY",
				responseTimeMs: 3500,
				scenarioId: "sc_2",
			},
		];

		// Act
		const summary = calculateSessionSummary(attempts);

		// Assert
		expect(summary.totalScenarios).toBe(2);
		expect(summary.correctCount).toBe(0);
		expect(summary.accuracyPercentage).toBe(0);
		expect(summary.averageLatencyMs).toBe(3000);
		expect(summary.moduleBreakdown.STRATEGY).toEqual({
			accuracyPercentage: 0,
			averageLatencyMs: 3000,
			correct: 0,
			total: 2,
		});
	});

	it("handles all-timeout attempts with zero accuracy and recorded latency", () => {
		// Arrange
		const attempts: SessionAttempt[] = [
			{
				isCorrect: false,
				isTimedOut: true,
				moduleType: "TACTICS",
				responseTimeMs: 3000,
				scenarioId: "sc_1",
			},
			{
				isCorrect: false,
				isTimedOut: true,
				moduleType: "TACTICS",
				responseTimeMs: 3000,
				scenarioId: "sc_2",
			},
		];

		// Act
		const summary = calculateSessionSummary(attempts);

		// Assert
		expect(summary.totalScenarios).toBe(2);
		expect(summary.correctCount).toBe(0);
		expect(summary.accuracyPercentage).toBe(0);
		expect(summary.averageLatencyMs).toBe(3000);
		expect(summary.moduleBreakdown.TACTICS).toEqual({
			accuracyPercentage: 0,
			averageLatencyMs: 3000,
			correct: 0,
			total: 2,
		});
	});

	it("aggregates metrics correctly across multi-module sessions and rounds values", () => {
		// Arrange
		const attempts: SessionAttempt[] = [
			{
				isCorrect: true,
				moduleType: "TACTICS",
				responseTimeMs: 1000,
				scenarioId: "sc_1",
			},
			{
				isCorrect: false,
				moduleType: "TACTICS",
				responseTimeMs: 2000,
				scenarioId: "sc_2",
			},
			{
				isCorrect: true,
				moduleType: "ULTIMATE",
				responseTimeMs: 1500,
				scenarioId: "sc_3",
			},
		];

		// Act
		const summary = calculateSessionSummary(attempts);

		// Assert
		// 2 correct out of 3 = 66.666% -> 67%
		// Latencies: (1000 + 2000 + 1500) / 3 = 1500ms
		expect(summary.totalScenarios).toBe(3);
		expect(summary.correctCount).toBe(2);
		expect(summary.accuracyPercentage).toBe(67);
		expect(summary.averageLatencyMs).toBe(1500);

		// TACTICS: 1/2 correct (50%), avg latency 1500ms
		expect(summary.moduleBreakdown.TACTICS).toEqual({
			accuracyPercentage: 50,
			averageLatencyMs: 1500,
			correct: 1,
			total: 2,
		});

		// ULTIMATE: 1/1 correct (100%), avg latency 1500ms
		expect(summary.moduleBreakdown.ULTIMATE).toEqual({
			accuracyPercentage: 100,
			averageLatencyMs: 1500,
			correct: 1,
			total: 1,
		});
	});
});
