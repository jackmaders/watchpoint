/**
 * Domain rule logic for retrieving performance telemetry details for an individual training playthrough.
 *
 * Implements `getHistoryDetailRule` enforcing authentication guards and querying playthrough
 * details through D1 query functions without throwing runtime exceptions.
 */

import {
	createDbClient,
	getPlaythroughById,
	getUserById,
	getVodById,
	type JsonValue,
	queryAttemptRecords,
	queryPlaythroughCompletions,
	queryPlaythroughModuleSelections,
	queryScenarioSnapshots,
} from "@/shared/db";
import { getCurrentUser } from "@/shared/lib/auth";
import {
	calculateAccuracy,
	calculateMedianActiveLatency,
} from "@/shared/lib/metrics";
import type {
	GetHistoryDetailInput,
	GetHistoryDetailResult,
	PlayerHistoryItem,
} from "./types";

function buildHistoryDetailItem(
	run: NonNullable<Awaited<ReturnType<typeof getPlaythroughById>>>,
	vod: Awaited<ReturnType<typeof getVodById>>,
	attempts: Awaited<ReturnType<typeof queryAttemptRecords>>,
	completion: Awaited<ReturnType<typeof queryPlaythroughCompletions>>[0] | null,
	scenarioSnapshots: Awaited<ReturnType<typeof queryScenarioSnapshots>>,
	moduleSelections: Awaited<
		ReturnType<typeof queryPlaythroughModuleSelections>
	>,
): PlayerHistoryItem {
	const correctAttemptsCount = attempts.filter((a) => a.isCorrect).length;
	const accuracy = calculateAccuracy(
		scenarioSnapshots.length,
		correctAttemptsCount,
	);
	const medianLatencyMs = calculateMedianActiveLatency(attempts);

	return {
		accuracy,
		attempts: attempts.map((a) => ({
			id: a.id,
			inputValue: a.inputValue as Record<string, JsonValue> | null,
			isCorrect: a.isCorrect,
			isTimedOut: a.isTimedOut,
			responseTimeMs: a.responseTimeMs,
			scenarioSnapshotId: a.scenarioSnapshotId,
			selectedOptionId: a.selectedOptionId,
		})),
		completedAt: run.completedAt,
		completion: completion
			? { completedAt: completion.completedAt, id: completion.id }
			: null,
		createdAt: run.createdAt,
		id: run.id,
		medianLatencyMs,
		moduleSelections: moduleSelections.map((m) => ({
			moduleType: m.moduleType,
		})),
		scenarioSnapshots: scenarioSnapshots.map((s) => ({
			explanationText: s.explanationText,
			id: s.id,
			imageUrl: s.imageUrl,
			inputConfig: s.inputConfig as Record<string, JsonValue>,
			inputType: s.inputType,
			moduleType: s.moduleType,
			position: s.position,
			promptText: s.promptText,
			scenarioId: s.scenarioId,
			timeLimitSeconds: s.timeLimitSeconds,
			timestampSeconds: s.timestampSeconds,
		})),
		status: run.status,
		userId: run.userId,
		vod: vod
			? {
					durationSeconds: vod.durationSeconds,
					id: vod.id,
					mapName: vod.mapName,
					rankTier: vod.rankTier,
					title: vod.title,
					youtubeVideoId: vod.youtubeVideoId,
				}
			: null,
		vodId: run.vodId,
	};
}

export async function getHistoryDetailRule(
	input: GetHistoryDetailInput,
	db = createDbClient(),
): Promise<GetHistoryDetailResult> {
	const user = await getCurrentUser();
	const userId = input.userId ?? user?.id;
	if (!userId) {
		return { reason: "Authentication required", status: "rejected" };
	}

	const dbUser = await getUserById(userId, db);
	if (dbUser?.isTestAccount) {
		return { data: null, status: "success" };
	}

	const run = await getPlaythroughById(input.id, db);
	if (!run || run.userId !== userId) {
		return { data: null, status: "success" };
	}

	const moduleSelections = await queryPlaythroughModuleSelections(
		{ filter: { playthroughId: { eq: run.id } } },
		db,
	);
	const attempts = await queryAttemptRecords(
		{
			filter: { playthroughId: { eq: run.id } },
			order: { createdAt: "asc" },
		},
		db,
	);
	const completions = await queryPlaythroughCompletions(
		{ filter: { playthroughId: { eq: run.id } } },
		db,
	);
	const scenarioSnapshots = await queryScenarioSnapshots(
		{
			filter: { playthroughId: { eq: run.id } },
			order: { position: "asc" },
		},
		db,
	);
	const vod = await getVodById(run.vodId, db);

	const item = buildHistoryDetailItem(
		run,
		vod,
		attempts,
		completions[0] ?? null,
		scenarioSnapshots,
		moduleSelections,
	);

	return { data: item, status: "success" };
}
