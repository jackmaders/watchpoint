"use server";

import { attemptRecords, getDb } from "@/shared/db";
import { GUEST_USER_ID, getCurrentUser } from "@/shared/lib/auth";
import {
	type RecordAttemptInput,
	RecordAttemptInputSchema,
	type RecordAttemptResult,
} from "../model/attempt";

export async function recordAttemptAction(
	input: RecordAttemptInput,
): Promise<RecordAttemptResult> {
	const parsed = RecordAttemptInputSchema.safeParse(input);
	if (!parsed.success) {
		return {
			error: "Invalid attempt payload",
			success: false,
		};
	}

	try {
		const currentUser = await getCurrentUser();
		const userId = currentUser?.id ?? GUEST_USER_ID;

		const db = await getDb();
		const [inserted] = await db
			.insert(attemptRecords)
			.values({
				inputValue:
					parsed.data.inputValue !== undefined ? parsed.data.inputValue : null,
				isCorrect: parsed.data.isCorrect,
				responseTimeMs: parsed.data.responseTimeMs,
				scenarioId: parsed.data.scenarioId,
				selectedOptionId: parsed.data.selectedOptionId ?? null,
				userId,
			})
			.returning({ id: attemptRecords.id });

		return {
			attemptId: inserted?.id,
			success: true,
		};
	} catch {
		return {
			error: "Failed to record attempt",
			success: false,
		};
	}
}
