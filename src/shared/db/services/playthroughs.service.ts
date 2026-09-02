/**
 * Coordinates durable attempt recording, session lifecycle state transitions, and historical
 * telemetry aggregation for interactive VOD training playthroughs.
 *
 * Implements the ADR-0007, ADR-0009, and ADR-0010 domain service contracts via `playthroughService`.
 * Wraps Drizzle ORM operations against Cloudflare D1 inside transactional boundaries, enforces idempotent
 * attempt recording and user ownership invariants, calculates playthrough accuracy and latency metrics, and projects results into `DbResult<T>`.
 */

import { and, count, desc, eq, inArray } from "drizzle-orm";
import {
	calculateAccuracy,
	calculateMedianActiveLatency,
} from "../../lib/metrics";
import {
	buildPaginatedResult,
	clampPagination,
	D1ErrorKind,
	type DbContext,
	type DbResult,
	type DrizzleDb,
	dbFailure,
	dbSuccess,
	getDb,
	type JsonValue,
	type PaginatedResult,
	type PaginationOptions,
	parseD1Error,
	toErrorMessage,
} from "../core";
import {
	attemptRecords,
	type PlaythroughStatus,
	playthroughCompletions,
	playthroughModuleSelections,
	playthroughs,
	scenarioSnapshots,
} from "../schema/playthroughs";
import type { ModuleType } from "../schema/vods";

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
export type PlaythroughWithDetails = PlaythroughItem & {
	attempts: AttemptRecordItem[];
	moduleSelections: { moduleType: ModuleType }[];
	scenarioSnapshots: (typeof scenarioSnapshots.$inferSelect)[];
};

export interface GetPlayerHistoryOptions extends PaginationOptions {
	modules?: readonly ModuleType[];
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

export type PlayerHistoryResult = PaginatedResult<PlayerHistoryItem>;

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

function sameJson(left: unknown, right: unknown): boolean {
	return JSON.stringify(left) === JSON.stringify(right);
}

function matchesStartRequest(
	playthrough: NonNullable<
		Awaited<ReturnType<typeof playthroughService.getById>> extends DbResult<
			infer T
		>
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
	const parsed = parseD1Error(error);
	if (!input.id || parsed.kind !== D1ErrorKind.UNIQUE_VIOLATION) {
		return dbFailure(toErrorMessage(error, "Failed to create playthrough"));
	}

	const existingResult = await playthroughService.getById(
		{ id: input.id, userId: input.userId },
		context,
	);
	if (
		existingResult.success &&
		existingResult.data &&
		matchesStartRequest(existingResult.data, input)
	) {
		return dbSuccess(existingResult.data);
	}

	return dbFailure(PLAYTHROUGH_START_CONFLICT_ERROR);
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

function isIdenticalAttempt(
	existing: AttemptRecordItem,
	input: RecordPlaythroughAttemptInput,
): boolean {
	return (
		existing.userId === input.userId &&
		existing.scenarioId === input.scenarioId &&
		existing.isCorrect === input.isCorrect &&
		Boolean(existing.isTimedOut) === Boolean(input.isTimedOut) &&
		existing.responseTimeMs === input.responseTimeMs &&
		(existing.playthroughId ?? null) === (input.playthroughId ?? null) &&
		(existing.scenarioSnapshotId ?? null) ===
			(input.scenarioSnapshotId ?? null) &&
		existing.selectedOptionId === (input.selectedOptionId ?? null) &&
		sameJson(existing.inputValue, input.inputValue ?? null)
	);
}

function isIdempotencyConstraintError(error: unknown): boolean {
	const parsed = parseD1Error(error);
	return (
		parsed.kind === D1ErrorKind.UNIQUE_VIOLATION &&
		parsed.column === "idempotency_key"
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

function buildHistoryConditions(
	db: DrizzleDb,
	userId: string,
	options: GetPlayerHistoryOptions,
) {
	const conditions = [eq(playthroughs.userId, userId)];
	if (options.status) {
		conditions.push(eq(playthroughs.status, options.status));
	}
	if (options.vodId) {
		conditions.push(eq(playthroughs.vodId, options.vodId));
	}
	if (options.modules && options.modules.length > 0) {
		conditions.push(
			inArray(
				playthroughs.id,
				db
					.select({
						playthroughId: playthroughModuleSelections.playthroughId,
					})
					.from(playthroughModuleSelections)
					.where(
						inArray(playthroughModuleSelections.moduleType, options.modules),
					),
			),
		);
	}
	return and(...conditions);
}

async function fetchHistoryRows(
	db: DrizzleDb,
	userId: string,
	options: GetPlayerHistoryOptions,
	pageSize: number,
	offset: number,
) {
	return db.query.playthroughs.findMany({
		limit: pageSize,
		offset,
		orderBy: [desc(playthroughs.createdAt), desc(playthroughs.id)],
		where: (table, { and: tableAnd, eq: tableEq, inArray: tableInArray }) => {
			const conds = [tableEq(table.userId, userId)];
			if (options.status) conds.push(tableEq(table.status, options.status));
			if (options.vodId) conds.push(tableEq(table.vodId, options.vodId));
			if (options.modules && options.modules.length > 0) {
				conds.push(
					tableInArray(
						table.id,
						db
							.select({
								playthroughId: playthroughModuleSelections.playthroughId,
							})
							.from(playthroughModuleSelections)
							.where(
								inArray(
									playthroughModuleSelections.moduleType,
									options.modules,
								),
							),
					),
				);
			}
			return tableAnd(...conds);
		},
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
}

export const playthroughService = {
	async complete(
		input: { id: string; userId: string },
		context?: DbContext,
	): Promise<DbResult<PlaythroughCompletionItem | null>> {
		try {
			const db = await getDb(context);
			const { id, userId } = input;
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

				return comp;
			});

			if (completion) return dbSuccess(completion);

			const existing = await db.query.playthroughCompletions.findFirst({
				where: (table, { and: tableAnd, eq: tableEq }) =>
					tableAnd(
						tableEq(table.playthroughId, id),
						tableEq(table.userId, userId),
					),
			});

			return dbSuccess(existing ?? null);
		} catch (error) {
			const parsed = parseD1Error(error);
			if (parsed.kind === D1ErrorKind.UNIQUE_VIOLATION) {
				const db = await getDb(context);
				const existing = await db.query.playthroughCompletions.findFirst({
					where: (table, { and: tableAnd, eq: tableEq }) =>
						tableAnd(
							tableEq(table.playthroughId, input.id),
							tableEq(table.userId, input.userId),
						),
				});
				return dbSuccess(existing ?? null);
			}

			return dbFailure(toErrorMessage(error, "Failed to complete playthrough"));
		}
	},

	async create(
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
	},

	async getAttemptByIdempotencyKey(
		input: { idempotencyKey: string; userId: string },
		context?: DbContext,
	): Promise<DbResult<AttemptRecordItem | null>> {
		try {
			const db = await getDb(context);
			const attempt = await db.query.attemptRecords.findFirst({
				where: (table, { and: tableAnd, eq: tableEq }) =>
					tableAnd(
						tableEq(table.idempotencyKey, input.idempotencyKey),
						tableEq(table.userId, input.userId),
					),
			});
			return dbSuccess(attempt ?? null);
		} catch (error) {
			return dbFailure(
				toErrorMessage(error, "Failed to retrieve attempt by key"),
			);
		}
	},

	async getAttempts(
		input: { playthroughId: string; userId: string },
		context?: DbContext,
	): Promise<DbResult<AttemptRecordItem[]>> {
		try {
			const db = await getDb(context);
			const attempts = await db.query.attemptRecords.findMany({
				orderBy: (table, { asc }) => [asc(table.createdAt)],
				where: (table, { and: tableAnd, eq: tableEq }) =>
					tableAnd(
						tableEq(table.playthroughId, input.playthroughId),
						tableEq(table.userId, input.userId),
					),
			});
			return dbSuccess(attempts);
		} catch (error) {
			return dbFailure(toErrorMessage(error, "Failed to retrieve attempts"));
		}
	},

	async getById(
		input: { id: string; userId: string },
		context?: DbContext,
	): Promise<DbResult<PlaythroughWithDetails | null>> {
		try {
			const db = await getDb(context);

			const playthrough = await db.query.playthroughs.findFirst({
				where: (table, { and: tableAnd, eq: tableEq }) =>
					tableAnd(
						tableEq(table.id, input.id),
						tableEq(table.userId, input.userId),
					),
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
			return dbFailure(toErrorMessage(error, "Failed to retrieve playthrough"));
		}
	},

	async getHistoryDetail(
		input: { playthroughId: string; userId: string },
		context?: DbContext,
	): Promise<DbResult<PlayerHistoryItem | null>> {
		try {
			const db = await getDb(context);
			const playthrough = await db.query.playthroughs.findFirst({
				where: (table, { and: tableAnd, eq: tableEq }) =>
					tableAnd(
						tableEq(table.id, input.playthroughId),
						tableEq(table.userId, input.userId),
					),
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
				toErrorMessage(error, "Failed to retrieve playthrough detail"),
			);
		}
	},

	async listHistory(
		options: GetPlayerHistoryOptions & { userId: string },
		context?: DbContext,
	): Promise<DbResult<PaginatedResult<PlayerHistoryItem>>> {
		try {
			const db = await getDb(context);
			const { userId } = options;
			const pagination = clampPagination(options);

			const user = await db.query.users.findFirst({
				columns: { isTestAccount: true },
				where: (table, { eq: userEq }) => userEq(table.id, userId),
			});

			if (!user || user.isTestAccount) {
				return dbSuccess(buildPaginatedResult([], 0, pagination));
			}

			const whereClause = buildHistoryConditions(db, userId, options);
			const [{ value: total = 0 } = {}] = await db
				.select({ value: count() })
				.from(playthroughs)
				.where(whereClause);

			const rows = await fetchHistoryRows(
				db,
				userId,
				options,
				pagination.pageSize,
				pagination.offset,
			);
			const items = rows.map((run) =>
				mapPlaythroughToHistoryItem(run as never),
			);

			return dbSuccess(buildPaginatedResult(items, total, pagination));
		} catch (error) {
			return dbFailure(toErrorMessage(error, "Failed to query player history"));
		}
	},

	async recordAttempt(
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
				return dbFailure(toErrorMessage(error, "Failed to record attempt"));
			}

			return handleAttemptIdempotencyRetry(input, context);
		}
	},
};
