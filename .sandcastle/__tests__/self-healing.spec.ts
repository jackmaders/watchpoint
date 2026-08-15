import { describe, expect, it, vi } from "vitest";
import {
	buildSelfHealingPrompt,
	executeSelfHealingLoop,
	runVerificationChecks,
} from "../self-healing";

describe("self-healing", () => {
	describe("runVerificationChecks", () => {
		it("returns success when both check:all and test:unit pass", async () => {
			// Arrange
			const executor = vi.fn().mockResolvedValue({
				exitCode: 0,
				stderr: "",
				stdout: "All checks passed",
			});

			// Act
			const result = await runVerificationChecks(executor);

			// Assert
			expect(result.success).toBe(true);
			expect(result.checks).toHaveLength(2);
			expect(executor).toHaveBeenCalledWith("bun run check:all");
			expect(executor).toHaveBeenCalledWith("bun run test:unit");
		});

		it("halts and reports failure when check:all fails", async () => {
			// Arrange
			const executor = vi
				.fn()
				.mockResolvedValueOnce({
					exitCode: 1,
					stderr: "Type error in src/main.ts: line 12",
					stdout: "",
				})
				.mockResolvedValueOnce({
					exitCode: 0,
					stderr: "",
					stdout: "",
				});

			// Act
			const result = await runVerificationChecks(executor);

			// Assert
			expect(result.success).toBe(false);
			expect(result.checks).toHaveLength(1);
			expect(result.aggregatedError).toContain(
				"Type error in src/main.ts: line 12",
			);
			expect(executor).toHaveBeenCalledTimes(1);
		});

		it("reports failure when test:unit fails after check:all passes", async () => {
			// Arrange
			const executor = vi
				.fn()
				.mockResolvedValueOnce({
					exitCode: 0,
					stderr: "",
					stdout: "Lint clean",
				})
				.mockResolvedValueOnce({
					exitCode: 1,
					stderr: "",
					stdout: "FAIL src/media.spec.ts: Expected 5 to be 10",
				});

			// Act
			const result = await runVerificationChecks(executor);

			// Assert
			expect(result.success).toBe(false);
			expect(result.checks).toHaveLength(2);
			expect(result.aggregatedError).toContain(
				"FAIL src/media.spec.ts: Expected 5 to be 10",
			);
		});
	});

	describe("buildSelfHealingPrompt", () => {
		it("formats self-healing prompt with attempt count and error log", () => {
			// Arrange
			const originalPrompt = "Implement player controls";
			const failureOutput = "TypeError: undefined is not a function";

			// Act
			const prompt = buildSelfHealingPrompt({
				attempt: 1,
				failureOutput,
				maxAttempts: 3,
				originalPrompt,
			});

			// Assert
			expect(prompt).toContain("attempt 1 of 3");
			expect(prompt).toContain("TypeError: undefined is not a function");
			expect(prompt).toContain("Original task: Implement player controls");
		});
	});

	describe("executeSelfHealingLoop", () => {
		it("completes on first attempt when verification passes immediately with progress callback", async () => {
			// Arrange
			const runIteration = vi.fn().mockResolvedValue(undefined);
			const verify = vi.fn().mockResolvedValue({
				checks: [
					{ name: "check:all", output: "OK", success: true },
					{ name: "test:unit", output: "OK", success: true },
				],
				success: true,
			});
			const onProgress = vi.fn();

			// Act
			const result = await executeSelfHealingLoop({
				initialPrompt: "Create button",
				maxRetries: 3,
				onProgress,
				runIteration,
				verify,
			});

			// Assert
			expect(result.success).toBe(true);
			expect(result.attempts).toBe(1);
			expect(runIteration).toHaveBeenCalledTimes(1);
			expect(runIteration).toHaveBeenCalledWith("Create button", 1);
			expect(onProgress).toHaveBeenCalledWith(
				"Starting execution iteration 1/3...",
			);
			expect(onProgress).toHaveBeenCalledWith(
				"Verification succeeded on iteration 1.",
			);
		});

		it("re-runs agent with feedback prompt when first attempt fails but second passes", async () => {
			// Arrange
			const runIteration = vi.fn().mockResolvedValue(undefined);
			const verify = vi
				.fn()
				.mockResolvedValueOnce({
					aggregatedError: "Missing semi",
					checks: [
						{ name: "check:all", output: "Missing semi", success: false },
					],
					success: false,
				})
				.mockResolvedValueOnce({
					checks: [
						{ name: "check:all", output: "OK", success: true },
						{ name: "test:unit", output: "OK", success: true },
					],
					success: true,
				});

			// Act
			const result = await executeSelfHealingLoop({
				initialPrompt: "Create button",
				maxRetries: 3,
				runIteration,
				verify,
			});

			// Assert
			expect(result.success).toBe(true);
			expect(result.attempts).toBe(2);
			expect(runIteration).toHaveBeenCalledTimes(2);
		});

		it("terminates and returns failure after exhausting max retries with empty aggregated error", async () => {
			// Arrange
			const runIteration = vi.fn().mockResolvedValue(undefined);
			const verify = vi.fn().mockResolvedValue({
				aggregatedError: undefined,
				checks: [{ name: "check:all", output: "", success: false }],
				success: false,
			});
			const onProgress = vi.fn();

			// Act
			const result = await executeSelfHealingLoop({
				initialPrompt: "Create button",
				maxRetries: 2,
				onProgress,
				runIteration,
				verify,
			});

			// Assert
			expect(result.success).toBe(false);
			expect(result.attempts).toBe(2);
			expect(runIteration).toHaveBeenCalledTimes(2);
			expect(onProgress).toHaveBeenCalledWith(
				"Verification failed on iteration 1: Unknown failure",
			);
		});
	});
});
