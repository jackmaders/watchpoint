import { type DbContext, getDb } from "../client/client";
import { attemptRecords, type JsonValue } from "../schema";

const IDEMPOTENCY_CONFLICT_ERROR = "Attempt idempotency conflict";

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

function areJsonValuesEqual(
	left: JsonValue | null | undefined,
	right: JsonValue | null | undefined,
): boolean {
	return JSON.stringify(left) === JSON.stringify(right);
}

type AttemptRecord = Awaited<
	ReturnType<
		Awaited<ReturnType<typeof getDb>>["query"]["attemptRecords"]["findFirst"]
	>
>;

function isIdenticalAttempt(
	existing: AttemptRecord,
	input: RecordPlaythroughAttemptInput,
): boolean {
	return (
		existing !== undefined &&
		existing !== null &&
		existing.userId === input.userId &&
		existing.scenarioId === input.scenarioId &&
		existing.isCorrect === input.isCorrect &&
		(existing.isTimedOut ?? false) === (input.isTimedOut ?? false) &&
		existing.responseTimeMs === input.responseTimeMs &&
		(existing.playthroughId ?? null) === (input.playthroughId ?? null) &&
		(existing.scenarioSnapshotId ?? null) ===
			(input.scenarioSnapshotId ?? null) &&
		existing.selectedOptionId === (input.selectedOptionId ?? null) &&
		areJsonValuesEqual(existing.inputValue, input.inputValue ?? null)
	);
}

function isIdempotencyConstraintError(error: unknown): boolean {
	return (
		error instanceof Error &&
		/unique constraint failed:\s*attempt_record\.idempotency_key$/i.test(
			error.message.trim(),
		)
	);
}

export async function recordPlaythroughAttempt(
	input: RecordPlaythroughAttemptInput,
	context?: DbContext,
) {
	const db = await getDb(context);
	try {
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
	} catch (error) {
		if (!isIdempotencyConstraintError(error)) throw error;

		const existing = await db.query.attemptRecords.findFirst({
			where: (attempt, { and, eq }) =>
				and(
					eq(attempt.idempotencyKey, input.idempotencyKey),
					eq(attempt.userId, input.userId),
				),
		});
		if (existing && isIdenticalAttempt(existing, input)) return existing;

		throw new Error(IDEMPOTENCY_CONFLICT_ERROR);
	}
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
