import { and, desc, eq } from "drizzle-orm";
import {
	calculateAccuracy,
	calculateMedianActiveLatency,
} from "../../lib/metrics";
import { type DbContext, getDb } from "../client/client";
import { type DbResult, dbFailure, dbSuccess } from "../common/result";
import type { JsonValue } from "../common/types";
import type { ModuleType } from "../vods/schema";
import {
	attemptRecords,
	type PlaythroughStatus,
	playthroughCompletions,
	playthroughModuleSelections,
	playthroughs,
	scenarioSnapshots,
} from "./schema";

export const PLAYTHROUGH_START_CONFLICT_ERROR = "Playthrough start conflict";
export const PLAYTHROUGH_NOT_IN_PROGRESS_ERROR =
	"Playthrough is not in progress";
export const IDEMPOTENCY_CONFLICT_ERROR = "Attempt idempotency conflict";

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

export type PlaythroughItem = typeof playthroughs.$inferSelect;
export type AttemptRecordItem = typeof attemptRecords.$inferSelect;
export type PlaythroughCompletionItem =
	typeof playthroughCompletions.$inferSelect;

function sameJson(left: unknown, right: unknown): boolean {
	return JSON.stringify(left) === JSON.stringify(right);
}

function matchesStartRequest(
	playthrough: NonNullable<
		Awaited<ReturnType<typeof getPlaythrough>> extends DbResult<infer T>
			? T
			: never
	>,
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

async function handlePlaythroughCreationConflict(
	input: CreatePlaythroughInput,
	error: unknown,
	context?: DbContext,
): Promise<DbResult<PlaythroughItem>> {
	if (
		!input.id ||
		!(error instanceof Error) ||
		!/unique constraint failed/i.test(error.message)
	) {
		return dbFailure(
			error instanceof Error ? error.message : "Failed to create playthrough",
		);
	}

	const existingResult = await getPlaythrough(input.id, input.userId, context);
	if (
		existingResult.success &&
		existingResult.data &&
		matchesStartRequest(existingResult.data, input)
	) {
		return dbSuccess(existingResult.data);
	}

	return dbFailure(PLAYTHROUGH_START_CONFLICT_ERROR);
}

export async function createPlaythrough(
	input: CreatePlaythroughInput,
	context?: DbContext,
): Promise<DbResult<PlaythroughItem>> {
	try {
		const db = await getDb(context);

		const playthrough = await db.transaction(async (tx) => {
			const [created] = await tx
				.insert(playthroughs)
				.values({
					...(input.id ? { id: input.id } : {}),
					userId: input.userId,
					vodId: input.vodId,
				})
				.returning();

			if (!created) {
				throw new Error("Failed to create playthrough");
			}

			if (input.modules.length > 0) {
				await tx.insert(playthroughModuleSelections).values(
					input.modules.map((moduleType) => ({
						moduleType,
						playthroughId: created.id,
					})),
				);
			}

			if (input.scenarios.length > 0) {
				await tx.insert(scenarioSnapshots).values(
					input.scenarios.map((scenario, position) => ({
						...(scenario.id ? { id: scenario.id } : {}),
						...scenario,
						playthroughId: created.id,
						position,
					})),
				);
			}

			return created;
		});

		return dbSuccess(playthrough);
	} catch (error) {
		return handlePlaythroughCreationConflict(input, error, context);
	}
}

export async function getPlaythrough(
	id: string,
	userId: string,
	context?: DbContext,
) {
	try {
		const db = await getDb(context);

		const playthrough = await db.query.playthroughs.findFirst({
			where: (table, { and, eq }) =>
				and(eq(table.id, id), eq(table.userId, userId)),
			with: {
				attempts: true,
				moduleSelections: true,
				scenarioSnapshots: {
					orderBy: (snapshots, { asc }) => [asc(snapshots.position)],
				},
			},
		});

		return dbSuccess(playthrough ?? null);
	} catch (error) {
		return dbFailure(
			error instanceof Error ? error.message : "Failed to retrieve playthrough",
		);
	}
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

export async function getPlayerHistory(
	userId: string,
	context?: DbContext,
): Promise<DbResult<PlaythroughItem[]>> {
	try {
		const db = await getDb(context);
		const playthroughsForUser = await db.query.playthroughs.findMany({
			orderBy: [desc(playthroughs.createdAt), desc(playthroughs.id)],
			where: (table, { eq }) => eq(table.userId, userId),
			with: {
				user: {
					columns: { isTestAccount: true },
				},
			},
		});

		const nonTest = playthroughsForUser.filter(
			(playthrough) => !playthrough.user.isTestAccount,
		);
		return dbSuccess(nonTest);
	} catch (error) {
		return dbFailure(
			error instanceof Error
				? error.message
				: "Failed to retrieve player history",
		);
	}
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
): Promise<DbResult<PlayerHistoryResult>> {
	try {
		const db = await getDb(context);
		const rawPlaythroughs = await db.query.playthroughs.findMany({
			orderBy: [desc(playthroughs.createdAt), desc(playthroughs.id)],
			where: (table, { eq }) => eq(table.userId, userId),
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

		const nonTestRuns = rawPlaythroughs.filter(
			(run) => !run.user?.isTestAccount,
		);
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

		return dbSuccess({
			items,
			page,
			pageSize,
			total,
			totalPages,
		});
	} catch (error) {
		return dbFailure(
			error instanceof Error ? error.message : "Failed to query player history",
		);
	}
}

export async function getPlaythroughHistoryDetail(
	playthroughId: string,
	userId: string,
	context?: DbContext,
): Promise<DbResult<PlayerHistoryItem | null>> {
	try {
		const db = await getDb(context);
		const playthrough = await db.query.playthroughs.findFirst({
			where: (table, { and, eq }) =>
				and(eq(table.id, playthroughId), eq(table.userId, userId)),
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
			return dbSuccess(null);
		}

		return dbSuccess(mapPlaythroughToHistoryItem(playthrough as never));
	} catch (error) {
		return dbFailure(
			error instanceof Error
				? error.message
				: "Failed to retrieve playthrough detail",
		);
	}
}

export async function completePlaythrough(
	id: string,
	userId: string,
	context?: DbContext,
): Promise<DbResult<PlaythroughCompletionItem | null>> {
	try {
		const db = await getDb(context);
		const completedAt = new Date();

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

			const [comp] = await tx
				.insert(playthroughCompletions)
				.values({ completedAt, playthroughId: id, userId })
				.returning();

			return comp ?? null;
		});

		if (completion) return dbSuccess(completion);

		const existing = await db.query.playthroughCompletions.findFirst({
			where: (table, { and, eq }) =>
				and(eq(table.playthroughId, id), eq(table.userId, userId)),
		});

		return dbSuccess(existing ?? null);
	} catch (error) {
		if (
			error instanceof Error &&
			/unique constraint failed/i.test(error.message)
		) {
			const db = await getDb(context);
			const existing = await db.query.playthroughCompletions.findFirst({
				where: (table, { and, eq }) =>
					and(eq(table.playthroughId, id), eq(table.userId, userId)),
			});
			return dbSuccess(existing ?? null);
		}

		return dbFailure(
			error instanceof Error ? error.message : "Failed to complete playthrough",
		);
	}
}

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

type AttemptRecordQuery = Awaited<
	ReturnType<
		Awaited<ReturnType<typeof getDb>>["query"]["attemptRecords"]["findFirst"]
	>
>;

function isIdenticalAttempt(
	existing: AttemptRecordQuery,
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
		sameJson(existing.inputValue, input.inputValue ?? null)
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

async function handleAttemptIdempotencyRetry(
	input: RecordPlaythroughAttemptInput,
	context?: DbContext,
): Promise<DbResult<AttemptRecordItem>> {
	const db = await getDb(context);
	const existing = await db.query.attemptRecords.findFirst({
		where: (table, { and, eq }) =>
			and(
				eq(table.idempotencyKey, input.idempotencyKey),
				eq(table.userId, input.userId),
			),
	});

	if (existing && isIdenticalAttempt(existing, input)) {
		return dbSuccess(existing);
	}

	return dbFailure(IDEMPOTENCY_CONFLICT_ERROR);
}

export async function recordPlaythroughAttempt(
	input: RecordPlaythroughAttemptInput,
	context?: DbContext,
): Promise<DbResult<AttemptRecordItem | null>> {
	try {
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

		return dbSuccess(attempt ?? null);
	} catch (error) {
		if (!isIdempotencyConstraintError(error)) {
			return dbFailure(
				error instanceof Error ? error.message : "Failed to record attempt",
			);
		}

		return handleAttemptIdempotencyRetry(input, context);
	}
}

export async function getPlaythroughAttempts(
	playthroughId: string,
	userId: string,
	context?: DbContext,
): Promise<DbResult<AttemptRecordItem[]>> {
	try {
		const db = await getDb(context);
		const attempts = await db.query.attemptRecords.findMany({
			orderBy: (table, { asc }) => [asc(table.createdAt)],
			where: (table, { and, eq }) =>
				and(eq(table.playthroughId, playthroughId), eq(table.userId, userId)),
		});
		return dbSuccess(attempts);
	} catch (error) {
		return dbFailure(
			error instanceof Error ? error.message : "Failed to retrieve attempts",
		);
	}
}

export async function getAttemptByIdempotencyKey(
	idempotencyKey: string,
	userId: string,
	context?: DbContext,
): Promise<DbResult<AttemptRecordItem | null>> {
	try {
		const db = await getDb(context);
		const attempt = await db.query.attemptRecords.findFirst({
			where: (table, { and, eq }) =>
				and(eq(table.idempotencyKey, idempotencyKey), eq(table.userId, userId)),
		});
		return dbSuccess(attempt ?? null);
	} catch (error) {
		return dbFailure(
			error instanceof Error
				? error.message
				: "Failed to retrieve attempt by key",
		);
	}
}
