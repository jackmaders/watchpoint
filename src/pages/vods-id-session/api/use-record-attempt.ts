/**
 * React Query mutation hook for resilient client-side scenario attempt telemetry delivery.
 *
 * Implements `useRecordAttemptMutation` with exponential backoff (`calculateBackoffDelay`), retry filtering
 * (`isRetryableAttemptError`), and Sentry exception capture for telemetry delivery errors.
 */
import { useMutation } from "@tanstack/react-query";
import { recordAttempt } from "@/entities/vod";
import { captureException } from "@/shared/lib/sentry";
import type {
	AttemptOutcome,
	RecordAttemptInput,
	RecordAttemptResult,
} from "../model/attempt";

export const MAX_ATTEMPT_DELIVERY_ATTEMPTS = 3;

export function calculateBackoffDelay(attemptIndex: number): number {
	return Math.min(1000 * 2 ** attemptIndex, 30000);
}

const PERMANENT_ERROR_PATTERN =
	/authorization|forbidden|idempotency conflict|invalid|malformed|validation/i;
const TRANSIENT_ERROR_PATTERN =
	/5\d\d|fetch failed|failed to fetch|failed to record attempt|network|service unavailable|temporarily unavailable|timeout|unavailable/i;

function getErrorStatus(error: unknown): number | undefined {
	if (typeof error !== "object" || error === null) return undefined;
	const status = (error as { status?: unknown }).status;
	return typeof status === "number" ? status : undefined;
}

function getErrorMessage(error: unknown): string {
	return error instanceof Error ? error.message : String(error);
}

export function isRetryableAttemptError(error: unknown): boolean {
	const message = getErrorMessage(error);
	if (PERMANENT_ERROR_PATTERN.test(message)) return false;
	const status = getErrorStatus(error);
	if (status !== undefined) return status >= 500 && status <= 599;
	return TRANSIENT_ERROR_PATTERN.test(message);
}

function shouldRetryAttempt(
	failureCount: number,
	error: unknown,
	maxRetries = MAX_ATTEMPT_DELIVERY_ATTEMPTS - 1,
): boolean {
	return failureCount < maxRetries && isRetryableAttemptError(error);
}

interface AttemptDeliveryFailure {
	error: Error;
	outcomeIdentity: string;
	scenarioId: string;
}

function reportAttemptDeliveryFailure({
	error,
	outcomeIdentity,
	scenarioId,
}: AttemptDeliveryFailure): void {
	captureException(error, {
		extra: { outcomeIdentity, scenarioId },
		tags: { telemetry: "attempt-delivery" },
	});
}

function resolveRetryPolicy(
	retryOverride: number | boolean | undefined,
): boolean | ((failureCount: number, error: Error) => boolean) {
	if (retryOverride === false || retryOverride === 0) return false;
	const maxRetries =
		typeof retryOverride === "number"
			? Math.min(Math.max(0, retryOverride), MAX_ATTEMPT_DELIVERY_ATTEMPTS - 1)
			: MAX_ATTEMPT_DELIVERY_ATTEMPTS - 1;
	return (failureCount, error) =>
		shouldRetryAttempt(failureCount, error, maxRetries);
}

function toError(error: unknown): Error {
	return error instanceof Error ? error : new Error(String(error));
}

export async function executeRecordAttempt(
	outcome: AttemptOutcome,
): Promise<RecordAttemptResult> {
	const result = await recordAttempt({
		data: mapOutcomeToRecordAttempt(outcome),
	});
	if (!result.success) {
		throw new Error(result.error ?? "Failed to record attempt");
	}
	return result;
}

function mapOutcomeToRecordAttempt(
	outcome: AttemptOutcome,
): RecordAttemptInput {
	return {
		idempotencyKey: outcome.idempotencyKey,
		isCorrect: outcome.isCorrect,
		isTimedOut: outcome.isTimedOut,
		responseTimeMs: outcome.responseTimeMs,
		scenarioId: outcome.scenarioId,
		selectedOptionId: outcome.selectedOptionId,
		...(outcome.playthroughId
			? {
					playthroughId: outcome.playthroughId,
					scenarioSnapshotId: outcome.scenarioSnapshotId,
				}
			: {}),
		...(outcome.inputValue === undefined
			? {}
			: { inputValue: outcome.inputValue }),
	};
}

export interface UseRecordAttemptOptions {
	retry?: number | boolean;
	retryDelay?: (attemptIndex: number) => number;
}

export function useRecordAttemptMutation(options?: UseRecordAttemptOptions) {
	return useMutation<RecordAttemptResult, Error, AttemptOutcome>({
		mutationFn: executeRecordAttempt,
		onError: (error, outcome) => {
			reportAttemptDeliveryFailure({
				error: toError(error),
				outcomeIdentity: outcome.idempotencyKey,
				scenarioId: outcome.scenarioId,
			});
		},
		retry: resolveRetryPolicy(options?.retry),
		retryDelay: options?.retryDelay ?? calculateBackoffDelay,
	});
}
