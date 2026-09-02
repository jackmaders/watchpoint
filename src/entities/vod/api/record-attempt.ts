/**
 * Action handler for validating and persisting user scenario attempt telemetry during a training session.
 *
 * Implements `recordAttemptAction` to enforce schema validation via `RecordAttemptInputSchema`, verify
 * authenticated user ownership of the active playthrough snapshot, and idempotently persist the attempt
 * outcome using `playthroughService.recordAttempt`.
 */
import { type DbContext, playthroughService } from "@/shared/db";
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
	context?: DbContext,
): Promise<boolean> {
	const result = await playthroughService.getById(
		{ id: playthroughId, userId },
		context,
	);
	if (!result.success || !result.data) return false;
	const playthrough = result.data;
	if (playthrough.status !== "IN_PROGRESS") return false;

	return playthrough.scenarioSnapshots.some((snapshot) => {
		if (snapshot.id !== scenarioSnapshotId) return false;
		return snapshot.scenarioId === scenarioId;
	});
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

		if (
			parsed.data.playthroughId &&
			parsed.data.scenarioSnapshotId &&
			!(await belongsToAuthenticatedPlaythrough(
				parsed.data.playthroughId,
				parsed.data.scenarioSnapshotId,
				parsed.data.scenarioId,
				userId,
				context,
			))
		) {
			return {
				error: "Playthrough snapshot ownership is required",
				success: false,
			};
		}

		const result = await playthroughService.recordAttempt(
			{
				idempotencyKey: parsed.data.idempotencyKey,
				inputValue: parsed.data.inputValue,
				isCorrect: parsed.data.isCorrect,
				isTimedOut: parsed.data.isTimedOut,
				playthroughId: parsed.data.playthroughId as string,
				responseTimeMs: parsed.data.responseTimeMs,
				scenarioId: parsed.data.scenarioId,
				scenarioSnapshotId: parsed.data.scenarioSnapshotId as string,
				selectedOptionId: parsed.data.selectedOptionId ?? null,
				userId,
			},
			context,
		);

		if (!result.success) {
			return {
				error: result.error,
				success: false,
			};
		}

		return {
			attemptId: result.data?.id,
			success: true,
		};
	} catch {
		return {
			error: "Failed to record attempt",
			success: false,
		};
	}
}
