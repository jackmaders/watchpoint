import { desc, eq } from "drizzle-orm";
import { createAuditEntry } from "../audit/repository";
import { type DbContext, getDb } from "../client/client";
import {
	type DbResult,
	dbFailure,
	dbSuccess,
	toErrorMessage,
} from "../common/result";
import type { JsonValue } from "../common/types";
import {
	type HeroRole,
	type InputType,
	type ModuleType,
	scenarios,
	vods,
} from "./schema";
import {
	insertVodSchema,
	validateScenarioConfig,
	validateVodForPublishing,
} from "./validation";

export interface GetSessionManifestOptions {
	modules?: readonly ModuleType[] | null;
	publishedOnly?: boolean;
}

export type PublishedVodItem = VodItem & {
	scenarios: Array<{ id: string }>;
};

export type SessionManifest = VodItem & {
	scenarios: ScenarioItem[];
};

export interface GetAdminVodsOptions {
	isPublished?: boolean;
	limit?: number;
	offset?: number;
	role?: HeroRole;
	search?: string;
}

export type AdminVodItem = VodItem & {
	scenarios: Array<{ id: string }>;
};

export type VodItem = typeof vods.$inferSelect;
export type ScenarioItem = typeof scenarios.$inferSelect;

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

export async function getPublishedVods(
	context?: DbContext,
): Promise<DbResult<Array<VodItem & { scenarios: Array<{ id: string }> }>>> {
	try {
		const db = await getDb(context);
		const result = await db.query.vods.findMany({
			orderBy: [desc(vods.createdAt)],
			where: (table, { eq }) => eq(table.isPublished, true),
			with: {
				scenarios: {
					columns: {
						id: true,
					},
				},
			},
		});
		return dbSuccess(result);
	} catch (error) {
		return dbFailure(
			toErrorMessage(error, "Failed to retrieve published VODs"),
		);
	}
}

export async function getAdminVods(
	options: GetAdminVodsOptions = {},
	context?: DbContext,
): Promise<DbResult<Array<VodItem & { scenarios: Array<{ id: string }> }>>> {
	try {
		const db = await getDb(context);
		const { isPublished, limit, offset, role, search } = options;

		const result = await db.query.vods.findMany({
			limit,
			offset,
			orderBy: [desc(vods.createdAt)],
			where: (table, { and, eq, like, or }) => {
				const conditions = [];
				if (typeof isPublished === "boolean") {
					conditions.push(eq(table.isPublished, isPublished));
				}
				if (role) {
					conditions.push(eq(table.role, role));
				}
				if (search && search.trim().length > 0) {
					const query = `%${search.trim().toLowerCase()}%`;
					conditions.push(
						or(
							like(table.title, query),
							like(table.heroName, query),
							like(table.mapName, query),
						),
					);
				}
				return conditions.length > 0 ? and(...conditions) : undefined;
			},
			with: {
				scenarios: {
					columns: {
						id: true,
					},
				},
			},
		});

		return dbSuccess(result);
	} catch (error) {
		return dbFailure(toErrorMessage(error, "Failed to retrieve admin VODs"));
	}
}

export async function getVodById(
	id: string,
	context?: DbContext,
): Promise<DbResult<(VodItem & { scenarios: ScenarioItem[] }) | null>> {
	try {
		const db = await getDb(context);
		const vod = await db.query.vods.findFirst({
			where: (table, { eq }) => eq(table.id, id),
			with: {
				scenarios: {
					orderBy: (scenariosTable, { asc }) => [
						asc(scenariosTable.timestampSeconds),
					],
				},
			},
		});

		return dbSuccess(vod ?? null);
	} catch (error) {
		return dbFailure(toErrorMessage(error, "Failed to retrieve VOD by ID"));
	}
}

export async function createVod(
	input: CreateVodInput,
	context?: DbContext,
): Promise<DbResult<VodItem>> {
	if (input.isPublished === true) {
		return dbFailure("Cannot publish a VOD with zero scenarios");
	}

	const parsed = insertVodSchema.safeParse(input);
	if (!parsed.success) {
		return dbFailure(parsed.error.issues[0].message);
	}

	try {
		const db = await getDb(context);
		const [vod] = await db
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
			return dbFailure("Failed to create VOD");
		}

		await createAuditEntry(
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

		return dbSuccess(vod);
	} catch (error) {
		return dbFailure(toErrorMessage(error, "Failed to create VOD"));
	}
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
		await createAuditEntry(
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
		await createAuditEntry(
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

export async function updateVod(
	input: UpdateVodInput,
	context?: DbContext,
): Promise<DbResult<VodItem>> {
	const existingResult = await getVodById(input.id, context);
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

	try {
		const db = await getDb(context);
		const [updatedVod] = await db
			.update(vods)
			.set(updateValues)
			.where(eq(vods.id, input.id))
			.returning();

		if (!updatedVod) {
			return dbFailure("Failed to update VOD");
		}

		await recordVodUpdateAudits(input, existing, updateValues, context);
		return dbSuccess(updatedVod);
	} catch (error) {
		return dbFailure(toErrorMessage(error, "Failed to update VOD"));
	}
}

export async function deleteVod(
	input: DeleteVodInput,
	context?: DbContext,
): Promise<DbResult<void>> {
	const existingResult = await getVodById(input.id, context);
	if (!existingResult.success) {
		return dbFailure(existingResult.error);
	}
	const existing = existingResult.data;
	if (!existing) {
		return dbFailure("VOD not found");
	}

	try {
		const db = await getDb(context);
		await db.delete(vods).where(eq(vods.id, input.id));

		await createAuditEntry(
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

		return dbSuccess(undefined);
	} catch (error) {
		return dbFailure(toErrorMessage(error, "Failed to delete VOD"));
	}
}

export async function setVodPublicationStatus(
	input: SetVodPublicationStatusInput,
	context?: DbContext,
): Promise<DbResult<VodItem>> {
	return updateVod(
		{
			actorUserId: input.actorUserId,
			id: input.id,
			isPublished: input.isPublished,
		},
		context,
	);
}

export interface BulkPublishVodsInput {
	actorUserId?: string | null;
	ids: string[];
	isPublished: boolean;
}

export interface BulkOperationResult {
	failed: Array<{ id: string; error: string }>;
	succeeded: string[];
}

export async function bulkPublishVods(
	input: BulkPublishVodsInput,
	context?: DbContext,
): Promise<DbResult<BulkOperationResult>> {
	const failed: Array<{ id: string; error: string }> = [];
	const succeeded: string[] = [];

	for (const id of input.ids) {
		const result = await setVodPublicationStatus(
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
}

export interface BulkDeleteVodsInput {
	actorUserId?: string | null;
	ids: string[];
}

export async function bulkDeleteVods(
	input: BulkDeleteVodsInput,
	context?: DbContext,
): Promise<DbResult<BulkOperationResult>> {
	const failed: Array<{ id: string; error: string }> = [];
	const succeeded: string[] = [];

	for (const id of input.ids) {
		const result = await deleteVod(
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
}

export async function getScenarioById(
	id: string,
	context?: DbContext,
): Promise<DbResult<ScenarioItem | null>> {
	try {
		const db = await getDb(context);
		const scenario = await db.query.scenarios.findFirst({
			where: (table, { eq }) => eq(table.id, id),
		});
		return dbSuccess(scenario ?? null);
	} catch (error) {
		return dbFailure(toErrorMessage(error, "Failed to retrieve scenario"));
	}
}

export async function getScenariosByVodId(
	vodId: string,
	context?: DbContext,
): Promise<DbResult<ScenarioItem[]>> {
	try {
		const db = await getDb(context);
		const scenarioList = await db.query.scenarios.findMany({
			orderBy: (table, { asc }) => [asc(table.timestampSeconds)],
			where: (table, { eq }) => eq(table.vodId, vodId),
		});
		return dbSuccess(scenarioList);
	} catch (error) {
		return dbFailure(toErrorMessage(error, "Failed to retrieve scenarios"));
	}
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

	const vodResult = await getVodById(input.vodId, context);
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

export async function createScenario(
	input: CreateScenarioInput,
	context?: DbContext,
): Promise<DbResult<ScenarioItem>> {
	const validationError = await validateScenarioCreation(input, context);
	if (validationError) {
		return dbFailure(validationError);
	}

	try {
		const db = await getDb(context);
		const [scenario] = await db
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
			return dbFailure("Failed to create scenario");
		}

		await createAuditEntry(
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

		return dbSuccess(scenario);
	} catch (error) {
		return dbFailure(toErrorMessage(error, "Failed to create scenario"));
	}
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

export async function updateScenario(
	input: UpdateScenarioInput,
	context?: DbContext,
): Promise<DbResult<ScenarioItem>> {
	const existingResult = await getScenarioById(input.id, context);
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

	try {
		const db = await getDb(context);
		const [updatedScenario] = await db
			.update(scenarios)
			.set(updateValues)
			.where(eq(scenarios.id, input.id))
			.returning();

		if (!updatedScenario) {
			return dbFailure("Failed to update scenario");
		}

		await createAuditEntry(
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

		return dbSuccess(updatedScenario);
	} catch (error) {
		return dbFailure(toErrorMessage(error, "Failed to update scenario"));
	}
}

export async function deleteScenario(
	input: DeleteScenarioInput,
	context?: DbContext,
): Promise<DbResult<void>> {
	const existingResult = await getScenarioById(input.id, context);
	if (!existingResult.success) {
		return dbFailure(existingResult.error);
	}
	const existing = existingResult.data;
	if (!existing) {
		return dbFailure("Scenario not found");
	}

	try {
		const db = await getDb(context);
		await db.delete(scenarios).where(eq(scenarios.id, input.id));

		await createAuditEntry(
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

		return dbSuccess(undefined);
	} catch (error) {
		return dbFailure(toErrorMessage(error, "Failed to delete scenario"));
	}
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

export async function reorderScenarios(
	input: ReorderScenariosInput,
	context?: DbContext,
): Promise<DbResult<void>> {
	const vodResult = await getVodById(input.vodId, context);
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

	try {
		const db = await getDb(context);
		for (const order of input.scenarioOrders) {
			await db
				.update(scenarios)
				.set({ timestampSeconds: order.timestampSeconds })
				.where(eq(scenarios.id, order.id));
		}

		await createAuditEntry(
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

		return dbSuccess(undefined);
	} catch (error) {
		return dbFailure(toErrorMessage(error, "Failed to reorder scenarios"));
	}
}

export async function getSessionManifest(
	id: string,
	options: GetSessionManifestOptions = {},
	context?: DbContext,
): Promise<DbResult<(VodItem & { scenarios: ScenarioItem[] }) | null>> {
	try {
		const db = await getDb(context);
		const { modules, publishedOnly = true } = options;

		const vod = await db.query.vods.findFirst({
			where: publishedOnly
				? (table, { and, eq }) =>
						and(eq(table.id, id), eq(table.isPublished, true))
				: (table, { eq }) => eq(table.id, id),
			with: {
				scenarios: {
					orderBy: (scenariosTable, { asc }) => [
						asc(scenariosTable.timestampSeconds),
					],
					where:
						modules === null
							? (_scenariosTable, { sql }) => sql`1 = 0`
							: modules !== undefined && modules.length > 0
								? (scenariosTable, { inArray }) =>
										inArray(scenariosTable.moduleType, modules)
								: undefined,
				},
			},
		});

		return dbSuccess(vod ?? null);
	} catch (error) {
		return dbFailure(
			toErrorMessage(error, "Failed to retrieve session manifest"),
		);
	}
}
