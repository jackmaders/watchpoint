import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook } from "@testing-library/react";
import type React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as entitiesVod from "@/entities/vod";
import * as sentry from "@/shared/lib/sentry";
import {
	calculateBackoffDelay,
	executeRecordAttempt,
	isRetryableAttemptError,
	useRecordAttemptMutation,
} from "../use-record-attempt";

vi.mock("@/entities/vod");

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

	it("classifies only transient network and service failures as retryable", () => {
		// Arrange
		const serviceFailure = Object.assign(new Error("Service unavailable"), {
			status: 503,
		});
		const permanentFailure = Object.assign(new Error("Invalid payload"), {
			status: 500,
		});

		// Act
		const results = [
			isRetryableAttemptError(null),
			isRetryableAttemptError("fetch failed"),
			isRetryableAttemptError(serviceFailure),
			isRetryableAttemptError(permanentFailure),
			isRetryableAttemptError({ status: "503" }),
			isRetryableAttemptError({ message: "Bad request", status: 400 }),
		];

		// Assert
		expect(results).toEqual([false, true, true, false, false, false]);
	});

	it("executes executeRecordAttempt successfully when server function returns success", async () => {
		// Arrange
		const payload = {
			idempotencyKey: "7b3b7f7e-4f3c-4f84-8a0d-5e3a4f7f2c91",
			inputValue: { selected: "option-1" },
			isCorrect: true,
			isTimedOut: false,
			moduleType: "STRATEGY" as const,
			responseTimeMs: 200,
			scenarioId: "a0000000-0000-0000-0000-000000000001",
			selectedOptionId: "option-1",
		};
		const recordAttempt = vi
			.spyOn(entitiesVod, "recordAttempt")
			.mockResolvedValueOnce({
				attemptId: "att_123",
				success: true,
			} as never);

		// Act
		const result = await executeRecordAttempt(payload);

		// Assert
		expect(result).toEqual({
			attemptId: "att_123",
			success: true,
		});
		expect(recordAttempt).toHaveBeenCalledWith({
			data: {
				idempotencyKey: payload.idempotencyKey,
				inputValue: payload.inputValue,
				isCorrect: true,
				isTimedOut: false,
				responseTimeMs: 200,
				scenarioId: payload.scenarioId,
				selectedOptionId: "option-1",
			},
		});
	});

	it("includes playthrough snapshot identifiers when recording a persisted attempt", async () => {
		// Arrange
		const payload = {
			idempotencyKey: "0b4b8b0b-1c4e-4c7f-8f33-7a6d9d8e4b21",
			isCorrect: true,
			isTimedOut: false,
			moduleType: "STRATEGY" as const,
			playthroughId: "playthrough_1",
			responseTimeMs: 200,
			scenarioId: "a0000000-0000-0000-0000-000000000001",
			scenarioSnapshotId: "snapshot_1",
			selectedOptionId: "option-1",
		};
		const recordAttempt = vi
			.spyOn(entitiesVod, "recordAttempt")
			.mockResolvedValueOnce({
				attemptId: "att_persisted",
				success: true,
			} as never);

		// Act
		await executeRecordAttempt(payload);

		// Assert
		expect(recordAttempt).toHaveBeenCalledWith({
			data: {
				idempotencyKey: payload.idempotencyKey,
				isCorrect: true,
				isTimedOut: false,
				playthroughId: payload.playthroughId,
				responseTimeMs: 200,
				scenarioId: payload.scenarioId,
				scenarioSnapshotId: payload.scenarioSnapshotId,
				selectedOptionId: "option-1",
			},
		});
	});

	it("throws error in executeRecordAttempt when server function returns unsuccessful result", async () => {
		// Arrange
		const payload = {
			idempotencyKey: "8c4c8f8f-5a4d-4f95-9b1e-6f4b5f8f3da2",
			isCorrect: false,
			isTimedOut: false,
			moduleType: "STRATEGY" as const,
			responseTimeMs: 500,
			scenarioId: "a0000000-0000-0000-0000-000000000001",
			selectedOptionId: "option-2",
		};
		vi.spyOn(entitiesVod, "recordAttempt").mockResolvedValueOnce({
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
			isTimedOut: false,
			moduleType: "STRATEGY" as const,
			responseTimeMs: 500,
			scenarioId: "a0000000-0000-0000-0000-000000000001",
			selectedOptionId: "option-2",
		};
		vi.spyOn(entitiesVod, "recordAttempt").mockResolvedValueOnce({
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
			isTimedOut: false,
			moduleType: "STRATEGY" as const,
			responseTimeMs: 350,
			scenarioId: "a0000000-0000-0000-0000-000000000001",
			selectedOptionId: "option-1",
		};
		vi.spyOn(entitiesVod, "recordAttempt").mockResolvedValueOnce({
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
		expect(res).toEqual({
			attemptId: "att_default",
			success: true,
		});
	});

	it("runs mutation successfully with explicit options override", async () => {
		// Arrange
		const payload = {
			idempotencyKey: "bf7fb1b2-8d70-42c8-ce41-9c7e81b260d5",
			isCorrect: true,
			isTimedOut: false,
			moduleType: "STRATEGY" as const,
			responseTimeMs: 350,
			scenarioId: "a0000000-0000-0000-0000-000000000001",
			selectedOptionId: "option-1",
		};
		vi.spyOn(entitiesVod, "recordAttempt").mockResolvedValueOnce({
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
		expect(res).toEqual({
			attemptId: "att_456",
			success: true,
		});
	});

	it("reuses the same idempotency key through a transient retry", async () => {
		// Arrange
		const payload = {
			idempotencyKey: "c0ffee00-0000-4000-8000-000000000001",
			isCorrect: true,
			isTimedOut: false,
			moduleType: "STRATEGY" as const,
			responseTimeMs: 350,
			scenarioId: "a0000000-0000-0000-0000-000000000001",
			selectedOptionId: "option-1",
		};
		const recordAttempt = vi
			.spyOn(entitiesVod, "recordAttempt")
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
			recordAttempt.mock.calls.map(
				([call]) =>
					(call as { data: { idempotencyKey: string } }).data.idempotencyKey,
			),
		).toEqual([payload.idempotencyKey, payload.idempotencyKey]);
	});

	it("limits transient delivery to three total requests", async () => {
		// Arrange
		const payload = {
			idempotencyKey: "c0ffee00-0000-4000-8000-000000000002",
			isCorrect: true,
			isTimedOut: false,
			moduleType: "STRATEGY" as const,
			responseTimeMs: 350,
			scenarioId: "a0000000-0000-0000-0000-000000000001",
			selectedOptionId: "option-1",
		};
		const recordAttempt = vi
			.spyOn(entitiesVod, "recordAttempt")
			.mockRejectedValue(new Error("Transient network failure"));
		const { result } = renderHook(
			() =>
				useRecordAttemptMutation({
					retryDelay: () => 0,
				}),
			{ wrapper: createWrapper() },
		);

		// Act
		await act(async () => {
			await expect(result.current.mutateAsync(payload)).rejects.toThrow(
				"Transient network failure",
			);
		});

		// Assert
		expect(recordAttempt).toHaveBeenCalledTimes(3);
	});

	it("does not retry validation failures", async () => {
		// Arrange
		const payload = {
			idempotencyKey: "c0ffee00-0000-4000-8000-000000000003",
			isCorrect: true,
			isTimedOut: false,
			moduleType: "STRATEGY" as const,
			responseTimeMs: 350,
			scenarioId: "a0000000-0000-0000-0000-000000000001",
			selectedOptionId: "option-1",
		};
		const recordAttempt = vi
			.spyOn(entitiesVod, "recordAttempt")
			.mockResolvedValue({
				error: "Invalid attempt payload",
				success: false,
			} as never);
		const { result } = renderHook(
			() =>
				useRecordAttemptMutation({
					retryDelay: () => 0,
				}),
			{ wrapper: createWrapper() },
		);

		// Act
		await act(async () => {
			await expect(result.current.mutateAsync(payload)).rejects.toThrow(
				"Invalid attempt payload",
			);
		});

		// Assert
		expect(recordAttempt).toHaveBeenCalledTimes(1);
	});

	it("does not retry malformed-payload failures", async () => {
		// Arrange
		const payload = {
			idempotencyKey: "c0ffee00-0000-4000-8000-000000000007",
			isCorrect: true,
			isTimedOut: false,
			moduleType: "STRATEGY" as const,
			responseTimeMs: 350,
			scenarioId: "a0000000-0000-0000-0000-000000000001",
			selectedOptionId: "option-1",
		};
		const recordAttempt = vi
			.spyOn(entitiesVod, "recordAttempt")
			.mockRejectedValue(new Error("Malformed payload"));
		const { result } = renderHook(
			() =>
				useRecordAttemptMutation({
					retryDelay: () => 0,
				}),
			{ wrapper: createWrapper() },
		);

		// Act
		await act(async () => {
			await expect(result.current.mutateAsync(payload)).rejects.toThrow(
				"Malformed payload",
			);
		});

		// Assert
		expect(recordAttempt).toHaveBeenCalledTimes(1);
	});

	it("does not retry authorization failures", async () => {
		// Arrange
		const payload = {
			idempotencyKey: "c0ffee00-0000-4000-8000-000000000004",
			isCorrect: true,
			isTimedOut: false,
			moduleType: "STRATEGY" as const,
			responseTimeMs: 350,
			scenarioId: "a0000000-0000-0000-0000-000000000001",
			selectedOptionId: "option-1",
		};
		const recordAttempt = vi
			.spyOn(entitiesVod, "recordAttempt")
			.mockRejectedValue(new Error("Unauthorized"));
		const { result } = renderHook(
			() =>
				useRecordAttemptMutation({
					retryDelay: () => 0,
				}),
			{ wrapper: createWrapper() },
		);

		// Act
		await act(async () => {
			await expect(result.current.mutateAsync(payload)).rejects.toThrow(
				"Unauthorized",
			);
		});

		// Assert
		expect(recordAttempt).toHaveBeenCalledTimes(1);
	});

	it("does not retry idempotency conflicts", async () => {
		// Arrange
		const payload = {
			idempotencyKey: "c0ffee00-0000-4000-8000-000000000005",
			isCorrect: true,
			isTimedOut: false,
			moduleType: "STRATEGY" as const,
			responseTimeMs: 350,
			scenarioId: "a0000000-0000-0000-0000-000000000001",
			selectedOptionId: "option-1",
		};
		const recordAttempt = vi
			.spyOn(entitiesVod, "recordAttempt")
			.mockResolvedValue({
				error: "Attempt idempotency conflict",
				success: false,
			} as never);
		const { result } = renderHook(
			() =>
				useRecordAttemptMutation({
					retryDelay: () => 0,
				}),
			{ wrapper: createWrapper() },
		);

		// Act
		await act(async () => {
			await expect(result.current.mutateAsync(payload)).rejects.toThrow(
				"Attempt idempotency conflict",
			);
		});

		// Assert
		expect(recordAttempt).toHaveBeenCalledTimes(1);
	});

	it("reports exhausted delivery with structured outcome context", async () => {
		// Arrange
		const payload = {
			idempotencyKey: "c0ffee00-0000-4000-8000-000000000006",
			isCorrect: false,
			isTimedOut: true,
			moduleType: "TACTICS" as const,
			responseTimeMs: 3000,
			scenarioId: "a0000000-0000-0000-0000-000000000002",
			selectedOptionId: null,
		};
		const error = new Error("Service unavailable");
		vi.spyOn(entitiesVod, "recordAttempt").mockRejectedValue(error);
		const captureException = vi.spyOn(sentry, "captureException");
		const { result } = renderHook(
			() =>
				useRecordAttemptMutation({
					retryDelay: () => 0,
				}),
			{ wrapper: createWrapper() },
		);

		// Act
		await act(async () => {
			await expect(result.current.mutateAsync(payload)).rejects.toThrow(
				"Service unavailable",
			);
		});

		// Assert
		expect(captureException).toHaveBeenCalledWith(error, {
			extra: {
				outcomeIdentity: payload.idempotencyKey,
				scenarioId: payload.scenarioId,
			},
			tags: {
				telemetry: "attempt-delivery",
			},
		});
	});

	it("normalizes a non-Error transport rejection for observability", async () => {
		// Arrange
		const payload = {
			idempotencyKey: "c0ffee00-0000-4000-8000-000000000008",
			isCorrect: true,
			isTimedOut: false,
			moduleType: "STRATEGY" as const,
			responseTimeMs: 350,
			scenarioId: "a0000000-0000-0000-0000-000000000001",
			selectedOptionId: "option-1",
		};
		vi.spyOn(entitiesVod, "recordAttempt").mockRejectedValue(
			"Service unavailable" as never,
		);
		const captureException = vi.spyOn(sentry, "captureException");
		const { result } = renderHook(
			() =>
				useRecordAttemptMutation({
					retryDelay: () => 0,
				}),
			{ wrapper: createWrapper() },
		);

		// Act
		await act(async () => {
			await expect(result.current.mutateAsync(payload)).rejects.toBe(
				"Service unavailable",
			);
		});

		// Assert
		expect(captureException).toHaveBeenCalledWith(
			expect.objectContaining({
				message: "Service unavailable",
			}),
			expect.anything(),
		);
	});
});
