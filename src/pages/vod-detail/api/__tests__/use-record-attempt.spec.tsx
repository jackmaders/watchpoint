import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook } from "@testing-library/react";
import type React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as serverFns from "../server-fns";
import {
	calculateBackoffDelay,
	executeRecordAttempt,
	useRecordAttemptMutation,
} from "../use-record-attempt";

describe("useRecordAttemptMutation", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	const createWrapper = () => {
		const queryClient = new QueryClient({
			defaultOptions: {
				mutations: {
					retry: false,
				},
			},
		});

		return ({ children }: { children: React.ReactNode }) => (
			<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
		);
	};

	it("computes exponential backoff delays with upper cap", () => {
		// Arrange & Act & Assert
		expect(calculateBackoffDelay(0)).toBe(1000);
		expect(calculateBackoffDelay(1)).toBe(2000);
		expect(calculateBackoffDelay(2)).toBe(4000);
		expect(calculateBackoffDelay(3)).toBe(8000);
		expect(calculateBackoffDelay(10)).toBe(30000);
	});

	it("executes executeRecordAttempt successfully when server function returns success", async () => {
		// Arrange
		const payload = {
			idempotencyKey: "7b3b7f7e-4f3c-4f84-8a0d-5e3a4f7f2c91",
			isCorrect: true,
			responseTimeMs: 200,
			scenarioId: "a0000000-0000-0000-0000-000000000001",
		};
		vi.spyOn(serverFns, "recordAttempt").mockResolvedValueOnce({
			attemptId: "att_123",
			success: true,
		} as never);

		// Act
		const result = await executeRecordAttempt(payload);

		// Assert
		expect(result).toEqual({ attemptId: "att_123", success: true });
	});

	it("throws error in executeRecordAttempt when server function returns unsuccessful result", async () => {
		// Arrange
		const payload = {
			idempotencyKey: "8c4c8f8f-5a4d-4f95-9b1e-6f4b5f8f3da2",
			isCorrect: false,
			responseTimeMs: 500,
			scenarioId: "a0000000-0000-0000-0000-000000000001",
		};
		vi.spyOn(serverFns, "recordAttempt").mockResolvedValueOnce({
			error: "Database unavailable",
			success: false,
		} as never);

		// Act & Assert
		await expect(executeRecordAttempt(payload)).rejects.toThrow(
			"Database unavailable",
		);
	});

	it("throws default error message in executeRecordAttempt when server function error string is omitted", async () => {
		// Arrange
		const payload = {
			idempotencyKey: "9d5d9f90-6b5e-40a6-ac2f-7a5c6f904eb3",
			isCorrect: false,
			responseTimeMs: 500,
			scenarioId: "a0000000-0000-0000-0000-000000000001",
		};
		vi.spyOn(serverFns, "recordAttempt").mockResolvedValueOnce({
			success: false,
		} as never);

		// Act & Assert
		await expect(executeRecordAttempt(payload)).rejects.toThrow(
			"Failed to record attempt",
		);
	});

	it("initializes hook with default options and executes mutation successfully", async () => {
		// Arrange
		const payload = {
			idempotencyKey: "ae6ea0a1-7c6f-41b7-bd30-8b6d70a15fc4",
			isCorrect: true,
			responseTimeMs: 350,
			scenarioId: "a0000000-0000-0000-0000-000000000001",
		};
		vi.spyOn(serverFns, "recordAttempt").mockResolvedValueOnce({
			attemptId: "att_default",
			success: true,
		} as never);

		const { result } = renderHook(() => useRecordAttemptMutation(), {
			wrapper: createWrapper(),
		});

		// Act
		let res: unknown;
		await act(async () => {
			res = await result.current.mutateAsync(payload);
		});

		// Assert
		expect(res).toEqual({ attemptId: "att_default", success: true });
	});

	it("runs mutation successfully with explicit options override", async () => {
		// Arrange
		const payload = {
			idempotencyKey: "bf7fb1b2-8d70-42c8-ce41-9c7e81b260d5",
			isCorrect: true,
			responseTimeMs: 350,
			scenarioId: "a0000000-0000-0000-0000-000000000001",
		};
		vi.spyOn(serverFns, "recordAttempt").mockResolvedValueOnce({
			attemptId: "att_456",
			success: true,
		} as never);

		const { result } = renderHook(
			() =>
				useRecordAttemptMutation({
					retry: false,
					retryDelay: () => 10,
				}),
			{
				wrapper: createWrapper(),
			},
		);

		// Act
		let res: unknown;
		await act(async () => {
			res = await result.current.mutateAsync(payload);
		});

		// Assert
		expect(res).toEqual({ attemptId: "att_456", success: true });
	});

	it("reuses the same idempotency key through a transient retry", async () => {
		// Arrange
		const payload = {
			idempotencyKey: "c0ffee00-0000-4000-8000-000000000001",
			isCorrect: true,
			responseTimeMs: 350,
			scenarioId: "a0000000-0000-0000-0000-000000000001",
		};
		const recordAttempt = vi
			.spyOn(serverFns, "recordAttempt")
			.mockRejectedValueOnce(new Error("Transient network failure"))
			.mockResolvedValueOnce({
				attemptId: "att_retried",
				success: true,
			} as never);
		const { result } = renderHook(
			() =>
				useRecordAttemptMutation({
					retry: 1,
					retryDelay: () => 0,
				}),
			{ wrapper: createWrapper() },
		);

		// Act
		let mutationResult: unknown;
		await act(async () => {
			mutationResult = await result.current.mutateAsync(payload);
		});

		// Assert
		expect(mutationResult).toEqual({
			attemptId: "att_retried",
			success: true,
		});
		expect(recordAttempt).toHaveBeenCalledTimes(2);
		expect(
			recordAttempt.mock.calls.map(([call]) => call.data.idempotencyKey),
		).toEqual([payload.idempotencyKey, payload.idempotencyKey]);
	});
});
