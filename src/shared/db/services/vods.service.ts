/**
 * Coordinates video on demand (VOD) catalog management, interactive scenario authoring,
 * session manifest compilation, and bulk administrative lifecycle operations.
 *
 * Implements the ADR-0002, ADR-0003, and ADR-0010 domain service contracts via `vodService`.
 * Encapsulates Drizzle ORM queries on Cloudflare D1, providing sanitized paginated catalog searches
 * via `escapeLike`, pre-session manifest resolution filtered by active module selection, publication
 * readiness validation, reordering operations, and automatic audit logging.
 */

import { and, count, eq, like, or, sql } from "drizzle-orm";
import {
	buildPaginatedResult,
	buildWhereConditions,
	clampPagination,
	type DbContext,
	dbFailure,
	dbSuccess,
	escapeLike,
	executeQuery,
	getDb,
	type JsonValue,
	type TableFilterOptions,
} from "../core";
import {
	type HeroRole,
	type InputType,
	type ModuleType,
	scenarios,
	vods,
} from "../schema/vods";
import {
	insertVodSchema,
	validateScenarioConfig,
	validateVodForPublishing,
} from "../validation/vods";
import { auditService } from "./audit.service";

// --- Base Types & DTOs ---
export type VodItem = typeof vods.$inferSelect;
export type ScenarioItem = typeof scenarios.$inferSelect;

export interface GetSessionManifestOptions {
	modules?: readonly ModuleType[] | null;
	publishedOnly?: boolean;
}

export interface GetSessionManifestInput extends GetSessionManifestOptions {
	id: string;
}

export type PublishedVodItem = VodItem & {
	scenarios: Array<{ id: string }>;
};

export type SessionManifest = VodItem & {
	scenarios: ScenarioItem[];
};

export type GetAdminVodsOptions = TableFilterOptions<
	typeof vods,
	"isPublished" | "role"
> & {
	search?: string;
};

export type AdminVodItem = VodItem & {
	scenarios: Array<{ id: string }>;
};

export interface CreateVodInput {
	actorUserId?: string | null;
	durationSeconds: number;
	heroName: string;
	isPublished?: boolean;
	mapName: string;
	rankTier: string;
	role: HeroRole;
	title: string;
	youtubeVideoId: string;
}

export interface UpdateVodInput {
	actorUserId?: string | null;
	durationSeconds?: number;
	heroName?: string;
	id: string;
	isPublished?: boolean;
	mapName?: string;
	rankTier?: string;
	role?: HeroRole;
	title?: string;
	youtubeVideoId?: string;
}

export interface DeleteVodInput {
	actorUserId?: string | null;
	id: string;
}

export interface SetVodPublicationStatusInput {
	actorUserId?: string | null;
	id: string;
	isPublished: boolean;
}

export interface BulkOperationResult {
	failed: Array<{ error: string; id: string }>;
	succeeded: string[];
}

export interface BulkPublishVodsInput {
	actorUserId?: string | null;
	ids: string[];
	isPublished: boolean;
}

export interface BulkDeleteVodsInput {
	actorUserId?: string | null;
	ids: string[];
}

export interface CreateScenarioInput {
	actorUserId?: string | null;
	explanationText: string;
	imageUrl?: string | null;
	inputConfig: Record<string, JsonValue>;
	inputType: InputType;
	moduleType: ModuleType;
	promptText: string;
	timeLimitSeconds?: number | null;
	timestampSeconds: number;
	vodId: string;
}

export interface UpdateScenarioInput {
	actorUserId?: string | null;
	explanationText?: string;
	id: string;
	imageUrl?: string | null;
	inputConfig?: Record<string, JsonValue>;
	inputType?: InputType;
	moduleType?: ModuleType;
	promptText?: string;
	timeLimitSeconds?: number | null;
	timestampSeconds?: number;
}

export interface DeleteScenarioInput {
	actorUserId?: string | null;
	id: string;
}

export interface ReorderScenariosInput {
	actorUserId?: string | null;
	scenarioOrders: Array<{ id: string; timestampSeconds: number }>;
	vodId: string;
}

function extractVodUpdateValues(
	input: UpdateVodInput,
): Partial<typeof vods.$inferInsert> {
	const values: Partial<typeof vods.$inferInsert> = {};
	if (input.title !== undefined) values.title = input.title;
	if (input.youtubeVideoId !== undefined)
		values.youtubeVideoId = input.youtubeVideoId;
	if (input.durationSeconds !== undefined)
		values.durationSeconds = input.durationSeconds;
	if (input.mapName !== undefined) values.mapName = input.mapName;
	if (input.rankTier !== undefined) values.rankTier = input.rankTier;
	if (input.heroName !== undefined) values.heroName = input.heroName;
	if (input.role !== undefined) values.role = input.role;
	if (input.isPublished !== undefined) values.isPublished = input.isPublished;
	return values;
}

async function recordVodUpdateAudits(
	input: UpdateVodInput,
	existing: typeof vods.$inferSelect,
	updateValues: Partial<typeof vods.$inferInsert>,
	context?: DbContext,
) {
	if (
		input.isPublished !== undefined &&
		input.isPublished !== existing.isPublished
	) {
		await auditService.create(
			{
				action: input.isPublished ? "VOD_PUBLISHED" : "VOD_UNPUBLISHED",
				actorUserId: input.actorUserId,
				entityId: input.id,
				entityType: "VOD",
				metadata: {
					isPublished: input.isPublished,
					previousState: existing.isPublished,
				},
			},
			context,
		);
	}

	const hasOtherChanges = Object.keys(updateValues).some(
		(key) => key !== "isPublished",
	);
	if (hasOtherChanges) {
		await auditService.create(
			{
				action: "VOD_UPDATED",
				actorUserId: input.actorUserId,
				entityId: input.id,
				entityType: "VOD",
				metadata: {
					updatedFields: updateValues as Record<string, JsonValue>,
				},
			},
			context,
		);
	}
}

function validatePublishingOnUpdate(
	input: UpdateVodInput,
	existing: VodItem & { scenarios: ScenarioItem[] },
): string | null {
	const willBePublished =
		input.isPublished !== undefined ? input.isPublished : existing.isPublished;

	if (!willBePublished) {
		return null;
	}

	const targetDuration = input.durationSeconds ?? existing.durationSeconds;
	const validation = validateVodForPublishing(
		{ durationSeconds: targetDuration },
		existing.scenarios,
	);

	/* v8 ignore next 3 */
	return validation.valid
		? null
		: (validation.error ?? "Invalid publishing state");
}

function extractScenarioUpdateValues(
	input: UpdateScenarioInput,
): Partial<typeof scenarios.$inferInsert> {
	const values: Partial<typeof scenarios.$inferInsert> = {};
	if (input.promptText !== undefined) values.promptText = input.promptText;
	if (input.explanationText !== undefined)
		values.explanationText = input.explanationText;
	if (input.timestampSeconds !== undefined)
		values.timestampSeconds = input.timestampSeconds;
	if (input.moduleType !== undefined) values.moduleType = input.moduleType;
	if (input.inputType !== undefined) values.inputType = input.inputType;
	if (input.inputConfig !== undefined) values.inputConfig = input.inputConfig;
	if (input.imageUrl !== undefined) values.imageUrl = input.imageUrl;
	if (input.timeLimitSeconds !== undefined)
		values.timeLimitSeconds = input.timeLimitSeconds;
	return values;
}

function validateScenarioUpdate(
	input: UpdateScenarioInput,
	existing: ScenarioItem,
): string | null {
	const mergedConfig = {
		explanationText: input.explanationText ?? existing.explanationText,
		inputConfig: input.inputConfig ?? existing.inputConfig,
		inputType: input.inputType ?? existing.inputType,
		promptText: input.promptText ?? existing.promptText,
		timeLimitSeconds:
			input.timeLimitSeconds !== undefined
				? input.timeLimitSeconds
				: existing.timeLimitSeconds,
		timestampSeconds:
			input.timestampSeconds !== undefined
				? input.timestampSeconds
				: existing.timestampSeconds,
	};

	const validation = validateScenarioConfig(mergedConfig);
	/* v8 ignore next 3 */
	return validation.valid
		? null
		: (validation.error ?? "Invalid scenario configuration");
}

function validateReorderOrders(
	orders: Array<{ id: string; timestampSeconds: number }>,
	vodScenarios: ScenarioItem[],
	vodId: string,
): string | null {
	const existingScenarioIds = new Set(vodScenarios.map((s) => s.id));
	for (const order of orders) {
		if (!existingScenarioIds.has(order.id)) {
			return `Scenario ${order.id} does not belong to VOD ${vodId}`;
		}
		if (
			typeof order.timestampSeconds !== "number" ||
			order.timestampSeconds < 0 ||
			!Number.isFinite(order.timestampSeconds)
		) {
			return "Scenario timestamp must be a non-negative number";
		}
	}
	return null;
}

async function validateScenarioCreation(
	input: CreateScenarioInput,
	context?: DbContext,
): Promise<string | null> {
	const validation = validateScenarioConfig(input);
	if (!validation.valid) {
		/* v8 ignore next */
		return validation.error ?? "Invalid scenario configuration";
	}

	const vodResult = await vodService.getById({ id: input.vodId }, context);
	if (!vodResult.success) {
		return vodResult.error;
	}
	const vod = vodResult.data;
	if (!vod) {
		return "VOD not found";
	}

	if (input.timestampSeconds > vod.durationSeconds) {
		return `Scenario timestamp (${input.timestampSeconds}s) exceeds VOD duration (${vod.durationSeconds}s)`;
	}

	return null;
}

function buildAdminWhereConditions(options: GetAdminVodsOptions) {
	const { search, ...filters } = options;
	const baseCondition = buildWhereConditions(vods, filters);

	if (!search || search.trim().length === 0) {
		return baseCondition;
	}

	const searchPattern = `%${escapeLike(search.trim().toLowerCase())}%`;
	const searchCondition = or(
		like(vods.title, searchPattern),
		like(vods.heroName, searchPattern),
		like(vods.mapName, searchPattern),
	);

	return baseCondition ? and(baseCondition, searchCondition) : searchCondition;
}

export const vodService = {
	async bulkDelete(input: BulkDeleteVodsInput, context?: DbContext) {
		const failed: Array<{ error: string; id: string }> = [];
		const succeeded: string[] = [];

		for (const id of input.ids) {
			const result = await vodService.delete(
				{
					actorUserId: input.actorUserId,
					id,
				},
				context,
			);

			if (result.success) {
				succeeded.push(id);
			} else {
				failed.push({ error: result.error, id });
			}
		}

		return dbSuccess({ failed, succeeded });
	},

	async bulkPublish(input: BulkPublishVodsInput, context?: DbContext) {
		const failed: Array<{ error: string; id: string }> = [];
		const succeeded: string[] = [];

		for (const id of input.ids) {
			const result = await vodService.setPublicationStatus(
				{
					actorUserId: input.actorUserId,
					id,
					isPublished: input.isPublished,
				},
				context,
			);

			if (result.success) {
				succeeded.push(id);
			} else {
				failed.push({ error: result.error, id });
			}
		}

		return dbSuccess({ failed, succeeded });
	},

	async create(input: CreateVodInput, context?: DbContext) {
		if (input.isPublished === true) {
			return dbFailure("Cannot publish a VOD with zero scenarios");
		}

		const parsed = insertVodSchema.safeParse(input);
		if (!parsed.success) {
			return dbFailure(parsed.error.issues[0].message);
		}

		return executeQuery(
			(async () => {
				const [vod] = await (await getDb(context))
					.insert(vods)
					.values({
						durationSeconds: input.durationSeconds,
						heroName: input.heroName,
						isPublished: false,
						mapName: input.mapName,
						rankTier: input.rankTier,
						role: input.role,
						title: input.title,
						youtubeVideoId: input.youtubeVideoId,
					})
					.returning();

				if (!vod) {
					throw new Error("Failed to create VOD");
				}

				await auditService.create(
					{
						action: "VOD_CREATED",
						actorUserId: input.actorUserId,
						entityId: vod.id,
						entityType: "VOD",
						metadata: {
							durationSeconds: vod.durationSeconds,
							heroName: vod.heroName,
							isPublished: vod.isPublished,
							mapName: vod.mapName,
							rankTier: vod.rankTier,
							role: vod.role,
							title: vod.title,
							youtubeVideoId: vod.youtubeVideoId,
						},
					},
					context,
				);

				return vod;
			})(),
			"Failed to create VOD",
		);
	},

	async createScenario(input: CreateScenarioInput, context?: DbContext) {
		const validationError = await validateScenarioCreation(input, context);
		if (validationError) {
			return dbFailure(validationError);
		}

		return executeQuery(
			(async () => {
				const [scenario] = await (await getDb(context))
					.insert(scenarios)
					.values({
						explanationText: input.explanationText,
						imageUrl: input.imageUrl ?? null,
						inputConfig: input.inputConfig,
						inputType: input.inputType,
						moduleType: input.moduleType,
						promptText: input.promptText,
						timeLimitSeconds: input.timeLimitSeconds ?? null,
						timestampSeconds: input.timestampSeconds,
						vodId: input.vodId,
					})
					.returning();

				if (!scenario) {
					throw new Error("Failed to create scenario");
				}

				await auditService.create(
					{
						action: "SCENARIO_CREATED",
						actorUserId: input.actorUserId,
						entityId: scenario.id,
						entityType: "SCENARIO",
						metadata: {
							inputType: scenario.inputType,
							moduleType: scenario.moduleType,
							promptText: scenario.promptText,
							timestampSeconds: scenario.timestampSeconds,
							vodId: scenario.vodId,
						},
					},
					context,
				);

				return scenario;
			})(),
			"Failed to create scenario",
		);
	},

	async delete(input: DeleteVodInput, context?: DbContext) {
		const existingResult = await vodService.getById({ id: input.id }, context);
		if (!existingResult.success) {
			return dbFailure(existingResult.error);
		}
		const existing = existingResult.data;
		if (!existing) {
			return dbFailure("VOD not found");
		}

		return executeQuery(
			(async () => {
				await (await getDb(context)).delete(vods).where(eq(vods.id, input.id));

				await auditService.create(
					{
						action: "VOD_DELETED",
						actorUserId: input.actorUserId,
						entityId: input.id,
						entityType: "VOD",
						metadata: {
							heroName: existing.heroName,
							mapName: existing.mapName,
							role: existing.role,
							title: existing.title,
						},
					},
					context,
				);

				return undefined;
			})(),
			"Failed to delete VOD",
		);
	},

	async deleteScenario(input: DeleteScenarioInput, context?: DbContext) {
		const existingResult = await vodService.getScenarioById(
			{ id: input.id },
			context,
		);
		if (!existingResult.success) {
			return dbFailure(existingResult.error);
		}
		const existing = existingResult.data;
		if (!existing) {
			return dbFailure("Scenario not found");
		}

		return executeQuery(
			(async () => {
				await (await getDb(context))
					.delete(scenarios)
					.where(eq(scenarios.id, input.id));

				await auditService.create(
					{
						action: "SCENARIO_DELETED",
						actorUserId: input.actorUserId,
						entityId: input.id,
						entityType: "SCENARIO",
						metadata: {
							moduleType: existing.moduleType,
							promptText: existing.promptText,
							timestampSeconds: existing.timestampSeconds,
							vodId: existing.vodId,
						},
					},
					context,
				);

				return undefined;
			})(),
			"Failed to delete scenario",
		);
	},

	async getById(input: { id: string }, context?: DbContext) {
		return executeQuery(
			(async () =>
				(await getDb(context)).query.vods.findFirst({
					where: { id: input.id },
					with: {
						scenarios: {
							orderBy: { timestampSeconds: "asc" },
						},
					},
				}))(),
			"Failed to retrieve VOD by ID",
		);
	},

	async getScenarioById(input: { id: string }, context?: DbContext) {
		return executeQuery(
			(async () =>
				(await getDb(context)).query.scenarios.findFirst({
					where: { id: input.id },
				}))(),
			"Failed to retrieve scenario",
		);
	},

	async getScenariosByVodId(input: { vodId: string }, context?: DbContext) {
		return executeQuery(
			(async () =>
				(await getDb(context)).query.scenarios.findMany({
					orderBy: { timestampSeconds: "asc" },
					where: { vodId: input.vodId },
				}))(),
			"Failed to retrieve scenarios",
		);
	},

	async getSessionManifest(
		input: GetSessionManifestInput,
		context?: DbContext,
	) {
		const { id, modules, publishedOnly = true } = input;

		return executeQuery(
			(async () =>
				(await getDb(context)).query.vods.findFirst({
					where: publishedOnly ? { id, isPublished: true } : { id },
					with: {
						scenarios: {
							orderBy: { timestampSeconds: "asc" },
							where:
								modules === null
									? { RAW: sql`1 = 0` }
									: modules !== undefined && modules.length > 0
										? { moduleType: { in: [...modules] } }
										: undefined,
						},
					},
				}))(),
			"Failed to retrieve session manifest",
		);
	},

	async listAdmin(options: GetAdminVodsOptions = {}, context?: DbContext) {
		const pagination = clampPagination(options);

		return executeQuery(
			(async () => {
				const db = await getDb(context);
				const combinedWhereClause = buildAdminWhereConditions(options);

				const [{ value: total = 0 } = {}] = await db
					.select({ value: count() })
					.from(vods)
					.where(combinedWhereClause);

				const result = await db.query.vods.findMany({
					limit: pagination.pageSize,
					offset: pagination.offset,
					orderBy: { createdAt: "desc", id: "desc" },
					where: combinedWhereClause ? { RAW: combinedWhereClause } : undefined,
					with: {
						scenarios: {
							columns: {
								id: true,
							},
						},
					},
				});

				return buildPaginatedResult(result, total, pagination);
			})(),
			"Failed to retrieve admin VODs",
		);
	},

	async listPublished(context?: DbContext) {
		return executeQuery(
			(async () =>
				(await getDb(context)).query.vods.findMany({
					orderBy: { createdAt: "desc", id: "desc" },
					where: { isPublished: true },
					with: {
						scenarios: {
							columns: {
								id: true,
							},
						},
					},
				}))(),
			"Failed to retrieve published VODs",
		);
	},

	async reorderScenarios(input: ReorderScenariosInput, context?: DbContext) {
		const vodResult = await vodService.getById({ id: input.vodId }, context);
		if (!vodResult.success) {
			return dbFailure(vodResult.error);
		}
		const vod = vodResult.data;
		if (!vod) {
			return dbFailure("VOD not found");
		}

		const orderError = validateReorderOrders(
			input.scenarioOrders,
			vod.scenarios,
			input.vodId,
		);
		if (orderError) {
			return dbFailure(orderError);
		}

		return executeQuery(
			(async () => {
				const db = await getDb(context);
				await db.transaction(async (tx) => {
					for (const order of input.scenarioOrders) {
						await tx
							.update(scenarios)
							.set({ timestampSeconds: order.timestampSeconds })
							.where(eq(scenarios.id, order.id));
					}

					await auditService.create(
						{
							action: "SCENARIOS_REORDERED",
							actorUserId: input.actorUserId,
							entityId: input.vodId,
							entityType: "VOD",
							metadata: {
								scenarioOrders: input.scenarioOrders as unknown as JsonValue,
							},
						},
						context,
					);
				});

				return undefined;
			})(),
			"Failed to reorder scenarios",
		);
	},

	async setPublicationStatus(
		input: SetVodPublicationStatusInput,
		context?: DbContext,
	) {
		return vodService.update(
			{
				actorUserId: input.actorUserId,
				id: input.id,
				isPublished: input.isPublished,
			},
			context,
		);
	},

	async update(input: UpdateVodInput, context?: DbContext) {
		const existingResult = await vodService.getById({ id: input.id }, context);
		if (!existingResult.success) {
			return dbFailure(existingResult.error);
		}
		const existing = existingResult.data;
		if (!existing) {
			return dbFailure("VOD not found");
		}

		const publishError = validatePublishingOnUpdate(input, existing);
		if (publishError) {
			return dbFailure(publishError);
		}

		const updateValues = extractVodUpdateValues(input);

		return executeQuery(
			(async () => {
				const [updatedVod] = await (await getDb(context))
					.update(vods)
					.set(updateValues)
					.where(eq(vods.id, input.id))
					.returning();

				if (!updatedVod) {
					throw new Error("Failed to update VOD");
				}

				await recordVodUpdateAudits(input, existing, updateValues, context);
				return updatedVod;
			})(),
			"Failed to update VOD",
		);
	},

	async updateScenario(input: UpdateScenarioInput, context?: DbContext) {
		const existingResult = await vodService.getScenarioById(
			{ id: input.id },
			context,
		);
		if (!existingResult.success) {
			return dbFailure(existingResult.error);
		}
		const existing = existingResult.data;
		if (!existing) {
			return dbFailure("Scenario not found");
		}

		const validationError = validateScenarioUpdate(input, existing);
		if (validationError) {
			return dbFailure(validationError);
		}

		const updateValues = extractScenarioUpdateValues(input);

		return executeQuery(
			(async () => {
				const [updatedScenario] = await (await getDb(context))
					.update(scenarios)
					.set(updateValues)
					.where(eq(scenarios.id, input.id))
					.returning();

				if (!updatedScenario) {
					throw new Error("Failed to update scenario");
				}

				await auditService.create(
					{
						action: "SCENARIO_UPDATED",
						actorUserId: input.actorUserId,
						entityId: input.id,
						entityType: "SCENARIO",
						metadata: {
							updatedFields: updateValues as Record<string, JsonValue>,
							vodId: existing.vodId,
						},
					},
					context,
				);

				return updatedScenario;
			})(),
			"Failed to update scenario",
		);
	},
};
