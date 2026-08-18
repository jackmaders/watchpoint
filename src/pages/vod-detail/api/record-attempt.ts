import { eq } from "drizzle-orm";
import type { JsonValue } from "@/shared/db";
import { attemptRecords, type DbContext, getDb } from "@/shared/db";
import { getCurrentUser } from "@/shared/lib/auth";
import {
	type RecordAttemptInput,
	RecordAttemptInputSchema,
	type RecordAttemptResult,
} from "../model/attempt";

const IDEMPOTENCY_CONFLICT_ERROR = "Attempt idempotency conflict";

function isUniqueConstraintError(error: unknown): boolean {
	return (
		error instanceof Error &&
		/unique constraint failed:\s*attempt_record\.idempotency_key$/i.test(
			error.message.trim(),
		)
	);
}

function areJsonArraysEqual(left: JsonValue[], right: JsonValue[]): boolean {
	return (
		left.length === right.length &&
		left.every((value, index) => areJsonValuesEqual(value, right[index]))
	);
}

function areJsonObjectsEqual(
	left: { [key: string]: JsonValue },
	right: { [key: string]: JsonValue },
): boolean {
	const leftKeys = Object.keys(left);
	const rightKeys = Object.keys(right);
	return (
		leftKeys.length === rightKeys.length &&
		leftKeys.every((key) => areJsonValuesEqual(left[key], right[key]))
	);
}

function areJsonValuesEqual(
	left: JsonValue | null | undefined,
	right: JsonValue | null | undefined,
): boolean {
	if (left === right) return true;
	if (typeof left !== "object" || left === null) return false;
	if (typeof right !== "object" || right === null) return false;

	if (Array.isArray(left) !== Array.isArray(right)) return false;
	if (Array.isArray(left) && Array.isArray(right)) {
		return areJsonArraysEqual(left, right);
	}

	return areJsonObjectsEqual(
		left as { [key: string]: JsonValue },
		right as { [key: string]: JsonValue },
	);
}

function isIdenticalAttempt(
	existing: {
		inputValue: Record<string, JsonValue> | null | undefined;
		isCorrect: boolean;
		isTimedOut: boolean | null | undefined;
		responseTimeMs: number;
		playthroughId?: string | null;
		scenarioId: string;
		scenarioSnapshotId?: string | null;
		selectedOptionId: string | null;
		userId: string;
	},
	input: RecordAttemptInput,
	userId: string,
): boolean {
	return (
		existing.userId === userId &&
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

async function belongsToAuthenticatedPlaythrough(
	db: AttemptDatabase,
	playthroughId: string,
	scenarioSnapshotId: string,
	userId: string,
): Promise<boolean> {
	const playthrough = await db.query.playthroughs.findFirst({
		where: (playthrough, { and, eq }) =>
			and(eq(playthrough.id, playthroughId), eq(playthrough.userId, userId)),
		with: {
			scenarioSnapshots: {
				columns: { id: true },
				where: (snapshot, { eq }) => eq(snapshot.id, scenarioSnapshotId),
			},
		},
	});

	return (playthrough?.scenarioSnapshots.length ?? 0) === 1;
}

type AttemptDatabase = Awaited<ReturnType<typeof getDb>>;

async function insertAttempt(
	db: AttemptDatabase,
	values: {
		idempotencyKey: string;
		inputValue: Record<string, JsonValue> | null;
		isCorrect: boolean;
		isTimedOut: boolean;
		responseTimeMs: number;
		scenarioId: string;
		selectedOptionId: string | null;
		userId: string;
	},
	input: RecordAttemptInput,
): Promise<RecordAttemptResult> {
	try {
		const [inserted] = await db
			.insert(attemptRecords)
			.values(values)
			.returning({ id: attemptRecords.id });

		return {
			attemptId: inserted?.id,
			success: true,
		};
	} catch (error) {
		if (!isUniqueConstraintError(error)) throw error;

		const existing = await db.query.attemptRecords.findFirst({
			where: eq(attemptRecords.idempotencyKey, input.idempotencyKey),
		});
		if (existing && isIdenticalAttempt(existing, input, values.userId)) {
			return { attemptId: existing.id, success: true };
		}

		return {
			error: IDEMPOTENCY_CONFLICT_ERROR,
			success: false,
		};
	}
}

export async function recordAttemptAction(
	input: RecordAttemptInput,
	context?: DbContext,
): Promise<RecordAttemptResult> {
	const parsed = RecordAttemptInputSchema.safeParse(input);
	if (!parsed.success) {
		return {
			error: "Invalid attempt payload",
			success: false,
		};
	}

	try {
		const currentUser = await getCurrentUser(undefined, context);
		if (!currentUser) {
			return {
				error: "Authentication required",
				success: false,
			};
		}
		const userId = currentUser.id;
		const hasPlaythroughId = Boolean(parsed.data.playthroughId);
		const hasScenarioSnapshotId = Boolean(parsed.data.scenarioSnapshotId);
		if (hasPlaythroughId !== hasScenarioSnapshotId) {
			return {
				error: "Playthrough snapshot ownership is required",
				success: false,
			};
		}
		const values = {
			idempotencyKey: parsed.data.idempotencyKey,
			inputValue:
				parsed.data.inputValue !== undefined ? parsed.data.inputValue : null,
			isCorrect: parsed.data.isCorrect,
			isTimedOut: parsed.data.isTimedOut,
			responseTimeMs: parsed.data.responseTimeMs,
			scenarioId: parsed.data.scenarioId,
			selectedOptionId: parsed.data.selectedOptionId ?? null,
			userId,
			...(parsed.data.playthroughId
				? { playthroughId: parsed.data.playthroughId }
				: {}),
			...(parsed.data.scenarioSnapshotId
				? { scenarioSnapshotId: parsed.data.scenarioSnapshotId }
				: {}),
		};

		const db = await getDb(context);
		if (
			parsed.data.playthroughId &&
			parsed.data.scenarioSnapshotId &&
			!(await belongsToAuthenticatedPlaythrough(
				db,
				parsed.data.playthroughId,
				parsed.data.scenarioSnapshotId,
				userId,
			))
		) {
			return {
				error: "Playthrough snapshot ownership is required",
				success: false,
			};
		}
		return await insertAttempt(db, values, parsed.data);
	} catch {
		return {
			error: "Failed to record attempt",
			success: false,
		};
	}
}
