/**
 * Domain rule logic for retrieving a player's interactive training playthrough history.
 *
 * Implements `getHistoryRule` enforcing authentication guards and querying playthrough
 * telemetry through D1 query functions without throwing runtime exceptions.
 */

import {
	createDbClient,
	getUserById,
	getVodById,
	type JsonValue,
	type ModuleType,
	queryAttemptRecords,
	queryPlaythroughCompletions,
	queryPlaythroughModuleSelections,
	queryPlaythroughs,
	queryScenarioSnapshots,
} from "@/shared/db";
import { getCurrentUser } from "@/shared/lib/auth";
import {
	calculateAccuracy,
	calculateMedianActiveLatency,
} from "@/shared/lib/metrics";
import type {
	GetHistoryInput,
	GetHistoryResult,
	PlayerHistoryItem,
} from "./types";

function matchesModuleFilter(
	moduleSelections: { moduleType: ModuleType }[],
	requiredModules?: readonly ModuleType[],
): boolean {
	if (!requiredModules || requiredModules.length === 0) {
		return true;
	}
	const selectedTypes = new Set(moduleSelections.map((m) => m.moduleType));
	return requiredModules.every((m) => selectedTypes.has(m));
}

function buildHistoryFilter(
	userId: string,
	options: GetHistoryInput,
): Record<string, unknown> {
	const filter: Record<string, unknown> = { userId: { eq: userId } };
	if (options.status) {
		filter.status = { eq: options.status };
	}
	if (options.vodId) {
		filter.vodId = { eq: options.vodId };
	}
	return filter;
}

async function loadHistoryRunItem(
	run: Awaited<ReturnType<typeof queryPlaythroughs>>[0],
	moduleSelections: Awaited<
		ReturnType<typeof queryPlaythroughModuleSelections>
	>,
	db = createDbClient(),
): Promise<PlayerHistoryItem> {
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

	const correctAttemptsCount = attempts.filter((a) => a.isCorrect).length;
	const accuracy = calculateAccuracy(
		scenarioSnapshots.length,
		correctAttemptsCount,
	);
	const medianLatencyMs = calculateMedianActiveLatency(attempts);
	const completion = completions[0] ?? null;

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

async function resolveHistoryUserId(
	optionsUserId?: string,
): Promise<string | null> {
	if (optionsUserId) return optionsUserId;
	const user = await getCurrentUser();
	return user?.id ?? null;
}

async function filterAndLoadHistoryRuns(
	runs: Awaited<ReturnType<typeof queryPlaythroughs>>,
	modules: readonly ModuleType[] | undefined,
	db = createDbClient(),
): Promise<PlayerHistoryItem[]> {
	const items: PlayerHistoryItem[] = [];
	for (const run of runs) {
		const moduleSelections = await queryPlaythroughModuleSelections(
			{ filter: { playthroughId: { eq: run.id } } },
			db,
		);
		if (matchesModuleFilter(moduleSelections, modules)) {
			items.push(await loadHistoryRunItem(run, moduleSelections, db));
		}
	}
	return items;
}

export async function getHistoryRule(
	options: GetHistoryInput = {},
	db = createDbClient(),
): Promise<GetHistoryResult> {
	const userId = await resolveHistoryUserId(options.userId);
	if (!userId) {
		return { reason: "Authentication required", status: "rejected" };
	}

	const dbUser = await getUserById(userId, db);
	if (dbUser?.isTestAccount) {
		const page = options.page ?? 1;
		const pageSize = options.pageSize ?? 10;
		return {
			data: { items: [], page, pageSize, total: 0, totalPages: 1 },
			status: "success",
		};
	}

	const filter = buildHistoryFilter(userId, options);
	const runs = await queryPlaythroughs(
		{ filter, order: { createdAt: "desc" } },
		db,
	);
	const items = await filterAndLoadHistoryRuns(runs, options.modules, db);

	const page = options.page ?? 1;
	const pageSize = options.pageSize ?? 10;
	const total = items.length;
	const totalPages = Math.max(1, Math.ceil(total / pageSize));
	const offset = (page - 1) * pageSize;
	const paginatedItems = items.slice(offset, offset + pageSize);

	return {
		data: {
			items: paginatedItems,
			page,
			pageSize,
			total,
			totalPages,
		},
		status: "success",
	};
}
