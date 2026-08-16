import { useMutation } from "@tanstack/react-query";
import type { RecordAttemptInput, RecordAttemptResult } from "../model/attempt";
import { recordAttempt } from "./server-fns";

export function calculateBackoffDelay(attemptIndex: number): number {
	return Math.min(1000 * 2 ** attemptIndex, 30000);
}

export async function executeRecordAttempt(
	payload: RecordAttemptInput,
): Promise<RecordAttemptResult> {
	const result = await recordAttempt({ data: payload });
	if (!result.success) {
		throw new Error(result.error ?? "Failed to record attempt");
	}
	return result;
}

export interface UseRecordAttemptOptions {
	retry?: number | boolean;
	retryDelay?: (attemptIndex: number) => number;
}

export function useRecordAttemptMutation(options?: UseRecordAttemptOptions) {
	return useMutation<RecordAttemptResult, Error, RecordAttemptInput>({
		mutationFn: executeRecordAttempt,
		retry: options?.retry ?? 3,
		retryDelay: options?.retryDelay ?? calculateBackoffDelay,
	});
}
