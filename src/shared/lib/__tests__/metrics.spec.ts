import { describe, expect, it } from "vitest";
import {
	calculateAccuracy,
	calculateMedianActiveLatency,
	formatAccuracy,
	formatLatency,
} from "../metrics";

describe("Shared metrics calculations", () => {
	describe("calculateAccuracy", () => {
		it("returns 0 when total scenarios is 0", () => {
			// Arrange
			const totalScenarios = 0;
			const correctCount = 0;

			// Act
			const result = calculateAccuracy(totalScenarios, correctCount);

			// Assert
			expect(result).toBe(0);
		});

		it("calculates accuracy percentage accurately from correct attempts and total snapshots", () => {
			// Arrange
			const totalScenarios = 4;
			const correctCount = 3;

			// Act
			const result = calculateAccuracy(totalScenarios, correctCount);

			// Assert
			expect(result).toBe(75);
		});

		it("returns 100 when all scenarios are correct", () => {
			// Arrange
			const totalScenarios = 5;
			const correctCount = 5;

			// Act
			const result = calculateAccuracy(totalScenarios, correctCount);

			// Assert
			expect(result).toBe(100);
		});
	});

	describe("calculateMedianActiveLatency", () => {
		it("returns null when there are no attempts", () => {
			// Arrange
			const attempts: { isTimedOut: boolean; responseTimeMs: number }[] = [];

			// Act
			const result = calculateMedianActiveLatency(attempts);

			// Assert
			expect(result).toBeNull();
		});

		it("returns null when all attempts are timeouts", () => {
			// Arrange
			const attempts = [
				{ isTimedOut: true, responseTimeMs: 3000 },
				{ isTimedOut: true, responseTimeMs: 3000 },
			];

			// Act
			const result = calculateMedianActiveLatency(attempts);

			// Assert
			expect(result).toBeNull();
		});

		it("returns single active attempt response time for odd count of 1", () => {
			// Arrange
			const attempts = [
				{ isTimedOut: false, responseTimeMs: 1250 },
				{ isTimedOut: true, responseTimeMs: 3000 },
			];

			// Act
			const result = calculateMedianActiveLatency(attempts);

			// Assert
			expect(result).toBe(1250);
		});

		it("computes middle value for odd number of active attempts", () => {
			// Arrange
			const attempts = [
				{ isTimedOut: false, responseTimeMs: 2100 },
				{ isTimedOut: false, responseTimeMs: 1200 },
				{ isTimedOut: false, responseTimeMs: 1800 },
			];

			// Act
			const result = calculateMedianActiveLatency(attempts);

			// Assert
			expect(result).toBe(1800);
		});

		it("computes average of middle two values for even number of active attempts", () => {
			// Arrange
			const attempts = [
				{ isTimedOut: false, responseTimeMs: 1000 },
				{ isTimedOut: false, responseTimeMs: 1500 },
				{ isTimedOut: false, responseTimeMs: 2000 },
				{ isTimedOut: false, responseTimeMs: 3000 },
			];

			// Act
			const result = calculateMedianActiveLatency(attempts);

			// Assert
			expect(result).toBe(1750);
		});

		it("rounds average to nearest integer millisecond", () => {
			// Arrange
			const attempts = [
				{ isTimedOut: false, responseTimeMs: 1001 },
				{ isTimedOut: false, responseTimeMs: 1002 },
			];

			// Act
			const result = calculateMedianActiveLatency(attempts);

			// Assert
			expect(result).toBe(1002);
		});
	});

	describe("formatters", () => {
		it("formats accuracy percentage to one decimal place if needed or whole number", () => {
			// Arrange
			const perfect = 100;
			const partial = 66.666;

			// Act
			const formattedPerfect = formatAccuracy(perfect);
			const formattedPartial = formatAccuracy(partial);

			// Assert
			expect(formattedPerfect).toBe("100%");
			expect(formattedPartial).toBe("66.7%");
		});

		it("formats latency in ms with unit or dash when null", () => {
			// Arrange
			const latency = 1450;
			const noLatency = null;

			// Act
			const formatted = formatLatency(latency);
			const formattedNull = formatLatency(noLatency);

			// Assert
			expect(formatted).toBe("1,450 ms");
			expect(formattedNull).toBe("—");
		});
	});
});
