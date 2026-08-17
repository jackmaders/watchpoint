import { useMutation } from "@tanstack/react-query";
import type {
	AttemptOutcome,
	RecordAttemptInput,
	RecordAttemptResult,
} from "../model/attempt";
import { recordAttempt } from "./server-fns";

export function calculateBackoffDelay(attemptIndex: number): number {
	return Math.min(1000 * 2 ** attemptIndex, 30000);
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
		retry: options?.retry ?? 3,
		retryDelay: options?.retryDelay ?? calculateBackoffDelay,
	});
}
