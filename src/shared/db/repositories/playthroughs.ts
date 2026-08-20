import { and, desc, eq } from "drizzle-orm";
import {
	calculateAccuracy,
	calculateMedianActiveLatency,
} from "../../lib/metrics";
import { type DbContext, getDb } from "../client/client";
import {
	auditEntries,
	type JsonValue,
	type ModuleType,
	type PlaythroughStatus,
	playthroughCompletions,
	playthroughModuleSelections,
	playthroughs,
	scenarioSnapshots,
} from "../schema";

export const PLAYTHROUGH_START_CONFLICT_ERROR = "Playthrough start conflict";
export const PLAYTHROUGH_NOT_IN_PROGRESS_ERROR =
	"Playthrough is not in progress";

export interface ScenarioSnapshotInput {
	id?: string;
	explanationText: string;
	imageUrl?: string | null;
	inputConfig: Record<string, JsonValue>;
	inputType:
		| "MULTIPLE_CHOICE"
		| "PERCENT_SLIDER"
		| "TIME_SLIDER"
		| "MAP_PIN_2D";
	moduleType: ModuleType;
	promptText: string;
	scenarioId: string;
	timeLimitSeconds?: number | null;
	timestampSeconds: number;
}

export interface CreatePlaythroughInput {
	id?: string;
	modules: readonly ModuleType[];
	scenarios: readonly ScenarioSnapshotInput[];
	userId: string;
	vodId: string;
}

function sameJson(left: unknown, right: unknown): boolean {
	return JSON.stringify(left) === JSON.stringify(right);
}

function matchesStartRequest(
	playthrough: NonNullable<Awaited<ReturnType<typeof getPlaythrough>>>,
	input: CreatePlaythroughInput,
): boolean {
	return (
		playthrough.userId === input.userId &&
		playthrough.vodId === input.vodId &&
		playthrough.moduleSelections.map((item) => item.moduleType).join(",") ===
			input.modules.join(",") &&
		playthrough.scenarioSnapshots.length === input.scenarios.length &&
		playthrough.scenarioSnapshots.every((snapshot, position) => {
			const scenario = input.scenarios[position];
			return (
				scenario !== undefined &&
				snapshot.position === position &&
				snapshot.scenarioId === scenario.scenarioId &&
				snapshot.moduleType === scenario.moduleType &&
				snapshot.promptText === scenario.promptText &&
				snapshot.explanationText === scenario.explanationText &&
				snapshot.imageUrl === (scenario.imageUrl ?? null) &&
				snapshot.inputType === scenario.inputType &&
				sameJson(snapshot.inputConfig, scenario.inputConfig) &&
				snapshot.timestampSeconds === scenario.timestampSeconds &&
				snapshot.timeLimitSeconds === (scenario.timeLimitSeconds ?? null)
			);
		})
	);
}

export async function createPlaythrough(
	input: CreatePlaythroughInput,
	context?: DbContext,
) {
	const db = await getDb(context);

	try {
		return await db.transaction(async (tx) => {
			const [playthrough] = await tx
				.insert(playthroughs)
				.values({
					...(input.id ? { id: input.id } : {}),
					userId: input.userId,
					vodId: input.vodId,
				})
				.returning();

			if (!playthrough) {
				throw new Error("Failed to create playthrough");
			}

			if (input.modules.length > 0) {
				await tx.insert(playthroughModuleSelections).values(
					input.modules.map((moduleType) => ({
						moduleType,
						playthroughId: playthrough.id,
					})),
				);
			}

			if (input.scenarios.length > 0) {
				await tx.insert(scenarioSnapshots).values(
					input.scenarios.map((scenario, position) => ({
						...(scenario.id ? { id: scenario.id } : {}),
						...scenario,
						playthroughId: playthrough.id,
						position,
					})),
				);
			}
			await tx.insert(auditEntries).values({
				action: "PLAYTHROUGH_CREATED",
				actorUserId: input.userId,
				entityId: playthrough.id,
				entityType: "PLAYTHROUGH",
				metadata: {
					moduleCount: input.modules.length,
					scenarioCount: input.scenarios.length,
					vodId: input.vodId,
				},
			});

			return playthrough;
		});
	} catch (error) {
		if (
			!input.id ||
			!(error instanceof Error) ||
			!/unique constraint failed/i.test(error.message)
		) {
			throw error;
		}
		const existing = await getPlaythrough(input.id, input.userId, context);
		if (existing && matchesStartRequest(existing, input)) return existing;
		throw new Error(PLAYTHROUGH_START_CONFLICT_ERROR);
	}
}

export async function getPlaythrough(
	id: string,
	userId: string,
	context?: DbContext,
) {
	const db = await getDb(context);

	return db.query.playthroughs.findFirst({
		where: (playthrough, { and, eq }) =>
			and(eq(playthrough.id, id), eq(playthrough.userId, userId)),
		with: {
			attempts: true,
			moduleSelections: true,
			scenarioSnapshots: {
				orderBy: (snapshots, { asc }) => [asc(snapshots.position)],
			},
		},
	});
}

export interface GetPlayerHistoryOptions {
	modules?: readonly ModuleType[];
	page?: number;
	pageSize?: number;
	status?: PlaythroughStatus;
	vodId?: string;
}

export interface PlayerHistoryItem {
	accuracy: number;
	attempts: {
		id: string;
		inputValue: Record<string, JsonValue> | null;
		isCorrect: boolean;
		isTimedOut: boolean;
		responseTimeMs: number;
		scenarioSnapshotId: string | null;
		selectedOptionId: string | null;
	}[];
	completedAt: Date | null;
	completion: {
		completedAt: Date;
		id: string;
	} | null;
	createdAt: Date;
	id: string;
	medianLatencyMs: number | null;
	moduleSelections: { moduleType: ModuleType }[];
	scenarioSnapshots: {
		explanationText: string;
		id: string;
		imageUrl: string | null;
		inputConfig: Record<string, JsonValue>;
		inputType:
			| "MULTIPLE_CHOICE"
			| "PERCENT_SLIDER"
			| "TIME_SLIDER"
			| "MAP_PIN_2D";
		moduleType: ModuleType;
		position: number;
		promptText: string;
		scenarioId: string;
		timeLimitSeconds: number | null;
		timestampSeconds: number;
	}[];
	status: PlaythroughStatus;
	userId: string;
	vod?: {
		durationSeconds: number;
		id: string;
		mapName: string;
		rankTier: string;
		title: string;
		youtubeVideoId: string;
	} | null;
	vodId: string;
}

export interface PlayerHistoryResult {
	items: PlayerHistoryItem[];
	page: number;
	pageSize: number;
	total: number;
	totalPages: number;
}

export async function getPlayerHistory(userId: string, context?: DbContext) {
	const db = await getDb(context);
	const playthroughsForUser = await db.query.playthroughs.findMany({
		orderBy: [desc(playthroughs.createdAt), desc(playthroughs.id)],
		where: (playthrough, { eq }) => eq(playthrough.userId, userId),
		with: {
			user: {
				columns: { isTestAccount: true },
			},
		},
	});

	return playthroughsForUser.filter(
		(playthrough) => !playthrough.user.isTestAccount,
	);
}

function matchesHistoryFilter(
	run: {
		moduleSelections: { moduleType: ModuleType }[];
		status: PlaythroughStatus;
		vodId: string;
	},
	options: GetPlayerHistoryOptions,
): boolean {
	if (options.status && run.status !== options.status) return false;
	if (options.vodId && run.vodId !== options.vodId) return false;
	if (options.modules && options.modules.length > 0) {
		return run.moduleSelections.some((m) =>
			options.modules?.includes(m.moduleType),
		);
	}
	return true;
}

function mapPlaythroughToHistoryItem(run: {
	attempts: {
		id: string;
		inputValue: Record<string, JsonValue> | null;
		isCorrect: boolean;
		isTimedOut: boolean;
		responseTimeMs: number;
		scenarioSnapshotId: string | null;
		selectedOptionId: string | null;
	}[];
	completedAt: Date | null;
	completion: {
		completedAt: Date;
		id: string;
	} | null;
	createdAt: Date;
	id: string;
	moduleSelections: { moduleType: ModuleType }[];
	scenarioSnapshots: {
		explanationText: string;
		id: string;
		imageUrl: string | null;
		inputConfig: Record<string, JsonValue>;
		inputType:
			| "MULTIPLE_CHOICE"
			| "PERCENT_SLIDER"
			| "TIME_SLIDER"
			| "MAP_PIN_2D";
		moduleType: ModuleType;
		position: number;
		promptText: string;
		scenarioId: string;
		timeLimitSeconds: number | null;
		timestampSeconds: number;
	}[];
	status: PlaythroughStatus;
	userId: string;
	vod?: {
		durationSeconds: number;
		id: string;
		mapName: string;
		rankTier: string;
		title: string;
		youtubeVideoId: string;
	} | null;
	vodId: string;
}): PlayerHistoryItem {
	const correctAttemptsCount = run.attempts.filter((a) => a.isCorrect).length;
	const accuracy = calculateAccuracy(
		run.scenarioSnapshots.length,
		correctAttemptsCount,
	);
	const medianLatencyMs = calculateMedianActiveLatency(run.attempts);

	return {
		accuracy,
		attempts: run.attempts as PlayerHistoryItem["attempts"],
		completedAt: run.completedAt,
		completion: run.completion as PlayerHistoryItem["completion"],
		createdAt: run.createdAt,
		id: run.id,
		medianLatencyMs,
		moduleSelections:
			run.moduleSelections as PlayerHistoryItem["moduleSelections"],
		scenarioSnapshots:
			run.scenarioSnapshots as PlayerHistoryItem["scenarioSnapshots"],
		status: run.status,
		userId: run.userId,
		vod: run.vod as PlayerHistoryItem["vod"],
		vodId: run.vodId,
	};
}

export async function queryPlayerHistory(
	userId: string,
	options: GetPlayerHistoryOptions = {},
	context?: DbContext,
): Promise<PlayerHistoryResult> {
	const db = await getDb(context);
	const rawPlaythroughs = await db.query.playthroughs.findMany({
		orderBy: [desc(playthroughs.createdAt), desc(playthroughs.id)],
		where: (playthrough, { eq }) => eq(playthrough.userId, userId),
		with: {
			attempts: true,
			completion: true,
			moduleSelections: true,
			scenarioSnapshots: {
				orderBy: (snapshots, { asc }) => [asc(snapshots.position)],
			},
			user: {
				columns: { isTestAccount: true },
			},
			vod: true,
		},
	});

	const nonTestRuns = rawPlaythroughs.filter((run) => !run.user?.isTestAccount);
	const filtered = nonTestRuns.filter((run) =>
		matchesHistoryFilter(run, options),
	);

	const total = filtered.length;
	const page = Math.max(1, options.page ?? 1);
	const pageSize = Math.min(50, Math.max(1, options.pageSize ?? 10));
	const totalPages = Math.max(1, Math.ceil(total / pageSize));
	const startIndex = (page - 1) * pageSize;
	const pagedRuns = filtered.slice(startIndex, startIndex + pageSize);

	const items: PlayerHistoryItem[] = pagedRuns.map((run) =>
		mapPlaythroughToHistoryItem(run as never),
	);

	return {
		items,
		page,
		pageSize,
		total,
		totalPages,
	};
}

export async function getPlaythroughHistoryDetail(
	playthroughId: string,
	userId: string,
	context?: DbContext,
): Promise<PlayerHistoryItem | null> {
	const db = await getDb(context);
	const playthrough = await db.query.playthroughs.findFirst({
		where: (playthrough, { and, eq }) =>
			and(eq(playthrough.id, playthroughId), eq(playthrough.userId, userId)),
		with: {
			attempts: true,
			completion: true,
			moduleSelections: true,
			scenarioSnapshots: {
				orderBy: (snapshots, { asc }) => [asc(snapshots.position)],
			},
			user: {
				columns: { isTestAccount: true },
			},
			vod: true,
		},
	});

	if (!playthrough || playthrough.user?.isTestAccount) {
		return null;
	}

	return mapPlaythroughToHistoryItem(playthrough as never);
}

export async function completePlaythrough(
	id: string,
	userId: string,
	context?: DbContext,
) {
	const db = await getDb(context);
	const completedAt = new Date();
	try {
		const completion = await db.transaction(async (tx) => {
			const [playthrough] = await tx
				.update(playthroughs)
				.set({
					completedAt,
					status: "COMPLETED" satisfies PlaythroughStatus,
				})
				.where(
					and(
						eq(playthroughs.id, id),
						eq(playthroughs.userId, userId),
						eq(playthroughs.status, "IN_PROGRESS"),
					),
				)
				.returning();
			if (!playthrough) return null;
			const [completion] = await tx
				.insert(playthroughCompletions)
				.values({ completedAt, playthroughId: id, userId })
				.returning();
			await tx.insert(auditEntries).values({
				action: "PLAYTHROUGH_COMPLETED",
				actorUserId: userId,
				entityId: id,
				entityType: "PLAYTHROUGH",
				metadata: { completionId: completion?.id ?? null },
			});
			return completion ?? null;
		});
		if (completion) return completion;
		return (
			(await db.query.playthroughCompletions.findFirst({
				where: (existing, { and, eq }) =>
					and(eq(existing.playthroughId, id), eq(existing.userId, userId)),
			})) ?? null
		);
	} catch (error) {
		if (
			!(error instanceof Error) ||
			!/unique constraint failed/i.test(error.message)
		) {
			throw error;
		}
		return db.query.playthroughCompletions.findFirst({
			where: (completion, { and, eq }) =>
				and(eq(completion.playthroughId, id), eq(completion.userId, userId)),
		});
	}
}
