import { type DbContext, getDb } from "../client/client";
import { attemptRecords, type JsonValue } from "../schema";

export interface RecordPlaythroughAttemptInput {
	idempotencyKey: string;
	inputValue?: Record<string, JsonValue> | null;
	isCorrect: boolean;
	isTimedOut?: boolean;
	playthroughId: string;
	responseTimeMs: number;
	scenarioId: string;
	scenarioSnapshotId: string;
	selectedOptionId?: string | null;
	userId: string;
}

export async function recordPlaythroughAttempt(
	input: RecordPlaythroughAttemptInput,
	context?: DbContext,
) {
	const db = await getDb(context);
	const [attempt] = await db
		.insert(attemptRecords)
		.values({
			idempotencyKey: input.idempotencyKey,
			inputValue: input.inputValue ?? null,
			isCorrect: input.isCorrect,
			isTimedOut: input.isTimedOut ?? false,
			playthroughId: input.playthroughId,
			responseTimeMs: input.responseTimeMs,
			scenarioId: input.scenarioId,
			scenarioSnapshotId: input.scenarioSnapshotId,
			selectedOptionId: input.selectedOptionId ?? null,
			userId: input.userId,
		})
		.returning();

	return attempt ?? null;
}

export async function getPlaythroughAttempts(
	playthroughId: string,
	userId: string,
	context?: DbContext,
) {
	const db = await getDb(context);

	return db.query.attemptRecords.findMany({
		orderBy: (attempt, { asc }) => [asc(attempt.createdAt)],
		where: (attempt, { and, eq }) =>
			and(eq(attempt.playthroughId, playthroughId), eq(attempt.userId, userId)),
	});
}

export async function getAttemptByIdempotencyKey(
	idempotencyKey: string,
	userId: string,
	context?: DbContext,
) {
	const db = await getDb(context);

	return db.query.attemptRecords.findFirst({
		where: (attempt, { and, eq }) =>
			and(
				eq(attempt.idempotencyKey, idempotencyKey),
				eq(attempt.userId, userId),
			),
	});
}
