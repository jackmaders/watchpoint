/**
 * Action handler for validating and persisting user scenario attempt telemetry during a training session.
 *
 * Implements `recordAttemptAction` to enforce schema validation via `RecordAttemptInputSchema`, verify
 * authenticated user ownership of the active playthrough snapshot, and persist the attempt
 * outcome using direct query functions.
 */
import {
	createAttemptRecord,
	createDbClient,
	getPlaythroughById,
	type JsonValue,
	queryScenarioSnapshots,
} from "@/shared/db";
import { getCurrentUser } from "@/shared/lib/auth";
import {
	type RecordAttemptInput,
	RecordAttemptInputSchema,
	type RecordAttemptResult,
} from "../model/attempt";

async function belongsToAuthenticatedPlaythrough(
	playthroughId: string,
	scenarioSnapshotId: string,
	scenarioId: string,
	userId: string,
	db = createDbClient(),
): Promise<boolean> {
	const playthrough = await getPlaythroughById(playthroughId, db);
	if (!playthrough || playthrough.userId !== userId) return false;
	if (playthrough.status !== "IN_PROGRESS") return false;

	const snapshots = await queryScenarioSnapshots(
		{
			filter: {
				id: { eq: scenarioSnapshotId },
				playthroughId: { eq: playthroughId },
			},
		},
		db,
	);

	return snapshots.some(
		(snapshot) =>
			snapshot.id === scenarioSnapshotId && snapshot.scenarioId === scenarioId,
	);
}

async function validatePlaythroughOwnership(
	data: {
		playthroughId?: string;
		scenarioSnapshotId?: string;
		scenarioId: string;
	},
	userId: string,
	db = createDbClient(),
): Promise<boolean> {
	const hasPlaythroughId = Boolean(data.playthroughId);
	const hasScenarioSnapshotId = Boolean(data.scenarioSnapshotId);
	if (hasPlaythroughId !== hasScenarioSnapshotId) {
		return false;
	}
	if (
		data.playthroughId &&
		data.scenarioSnapshotId &&
		!(await belongsToAuthenticatedPlaythrough(
			data.playthroughId,
			data.scenarioSnapshotId,
			data.scenarioId,
			userId,
			db,
		))
	) {
		return false;
	}
	return true;
}

export async function recordAttemptAction(
	input: RecordAttemptInput,
	db = createDbClient(),
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
		if (!currentUser) {
			return {
				error: "Authentication required",
				success: false,
			};
		}
		const userId = currentUser.id;
		const isValidOwnership = await validatePlaythroughOwnership(
			parsed.data,
			userId,
			db,
		);
		if (!isValidOwnership) {
			return {
				error: "Playthrough snapshot ownership is required",
				success: false,
			};
		}

		const attempt = await createAttemptRecord(
			{
				idempotencyKey: parsed.data.idempotencyKey,
				inputValue:
					(parsed.data.inputValue as Record<string, JsonValue> | undefined) ??
					null,
				isCorrect: parsed.data.isCorrect,
				isTimedOut: parsed.data.isTimedOut,
				playthroughId: parsed.data.playthroughId as string,
				responseTimeMs: parsed.data.responseTimeMs,
				scenarioId: parsed.data.scenarioId,
				scenarioSnapshotId: parsed.data.scenarioSnapshotId as string,
				selectedOptionId: parsed.data.selectedOptionId ?? null,
				userId,
			},
			db,
		);

		return {
			attemptId: attempt?.id,
			success: true,
		};
	} catch (error) {
		const message =
			error instanceof Error ? error.message : "Failed to record attempt";
		return {
			error: message,
			success: false,
		};
	}
}
