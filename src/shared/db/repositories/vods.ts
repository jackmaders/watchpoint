import { desc, eq } from "drizzle-orm";
import { type DbContext, getDb } from "../client/client";
import {
	type HeroRole,
	type InputType,
	type JsonValue,
	type ModuleType,
	scenarios,
	vods,
} from "../schema";
import { createAuditEntry } from "./audit";

export interface GetSessionManifestOptions {
	/** A null filter represents a nonblank filter with no valid module types. */
	modules?: readonly ModuleType[] | null;
	publishedOnly?: boolean;
}

export type PublishedVodItem = Awaited<
	ReturnType<typeof getPublishedVods>
>[number];

export type SessionManifest = NonNullable<
	Awaited<ReturnType<typeof getSessionManifest>>
>;

export interface GetAdminVodsOptions {
	isPublished?: boolean;
	limit?: number;
	offset?: number;
	role?: HeroRole;
	search?: string;
}

export type AdminVodItem = Awaited<ReturnType<typeof getAdminVods>>[number];

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

export interface CreateVodResult {
	error?: string;
	success: boolean;
	vod?: typeof vods.$inferSelect;
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

export interface UpdateVodResult {
	error?: string;
	success: boolean;
	vod?: typeof vods.$inferSelect;
}

export interface DeleteVodInput {
	actorUserId?: string | null;
	id: string;
}

export interface DeleteVodResult {
	error?: string;
	success: boolean;
}

export interface SetVodPublicationStatusInput {
	actorUserId?: string | null;
	id: string;
	isPublished: boolean;
}

export interface SetVodPublicationStatusResult {
	error?: string;
	success: boolean;
	vod?: typeof vods.$inferSelect;
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

export interface CreateScenarioResult {
	error?: string;
	scenario?: typeof scenarios.$inferSelect;
	success: boolean;
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

export interface UpdateScenarioResult {
	error?: string;
	scenario?: typeof scenarios.$inferSelect;
	success: boolean;
}

export interface DeleteScenarioInput {
	actorUserId?: string | null;
	id: string;
}

export interface DeleteScenarioResult {
	error?: string;
	success: boolean;
}

export interface ReorderScenariosInput {
	actorUserId?: string | null;
	scenarioOrders: Array<{ id: string; timestampSeconds: number }>;
	vodId: string;
}

export interface ReorderScenariosResult {
	error?: string;
	success: boolean;
}

function validateMultipleChoice(config: Record<string, unknown>): {
	error?: string;
	valid: boolean;
} {
	const options = config.options;
	if (!Array.isArray(options) || options.length < 2) {
		return {
			error: "Multiple choice scenarios require at least 2 options",
			valid: false,
		};
	}
	const hasCorrect = options.some(
		(opt) =>
			typeof opt === "object" &&
			opt !== null &&
			opt.is_correct === true &&
			typeof opt.text === "string" &&
			opt.text.trim().length > 0,
	);
	if (!hasCorrect) {
		return {
			error:
				"Multiple choice scenarios require at least one correct option with text",
			valid: false,
		};
	}
	return { valid: true };
}

function validateBoundedSlider(
	config: Record<string, unknown>,
	defaultRange: { max: number; min: number },
	typeName: string,
): { error?: string; valid: boolean } {
	const { min = defaultRange.min, max = defaultRange.max, target } = config;
	if (
		typeof min !== "number" ||
		typeof max !== "number" ||
		typeof target !== "number" ||
		min >= max ||
		target < min ||
		target > max
	) {
		return {
			error: `${typeName} requires min < max and target within range`,
			valid: false,
		};
	}
	return { valid: true };
}

function validateMapPin(config: Record<string, unknown>): {
	error?: string;
	valid: boolean;
} {
	const targetX = config.targetX ?? config.x;
	const targetY = config.targetY ?? config.y;
	if (typeof targetX !== "number" || typeof targetY !== "number") {
		return {
			error: "Map pin requires valid target coordinates",
			valid: false,
		};
	}
	return { valid: true };
}

function validateScenarioInputConfig(
	inputType: InputType,
	config: Record<string, unknown>,
): { error?: string; valid: boolean } {
	switch (inputType) {
		case "MULTIPLE_CHOICE":
			return validateMultipleChoice(config);
		case "PERCENT_SLIDER":
			return validateBoundedSlider(
				config,
				{ max: 100, min: 0 },
				"Percent slider",
			);
		case "TIME_SLIDER":
			return validateBoundedSlider(config, { max: 10, min: 0 }, "Time slider");
		case "MAP_PIN_2D":
			return validateMapPin(config);
	}
}

function validateScenarioBasicFields(scenario: {
	explanationText?: string | null;
	promptText?: string | null;
	timeLimitSeconds?: number | null;
	timestampSeconds?: number | null;
}): { error?: string; valid: boolean } {
	if (!scenario.promptText?.trim()) {
		return { error: "Scenario prompt text is required", valid: false };
	}
	if (!scenario.explanationText?.trim()) {
		return { error: "Scenario explanation text is required", valid: false };
	}
	if (
		typeof scenario.timestampSeconds !== "number" ||
		scenario.timestampSeconds < 0 ||
		!Number.isFinite(scenario.timestampSeconds)
	) {
		return {
			error: "Scenario timestamp must be a non-negative number",
			valid: false,
		};
	}
	if (
		scenario.timeLimitSeconds !== undefined &&
		scenario.timeLimitSeconds !== null &&
		(typeof scenario.timeLimitSeconds !== "number" ||
			scenario.timeLimitSeconds <= 0)
	) {
		return {
			error: "Scenario time limit must be a positive integer",
			valid: false,
		};
	}
	return { valid: true };
}

export function validateScenarioConfig(scenario: {
	explanationText?: string | null;
	inputConfig?: unknown;
	inputType?: InputType | null;
	promptText?: string | null;
	timeLimitSeconds?: number | null;
	timestampSeconds?: number | null;
}): { error?: string; valid: boolean } {
	const basicValidation = validateScenarioBasicFields(scenario);
	if (!basicValidation.valid) {
		return basicValidation;
	}
	if (!scenario.inputType) {
		return { error: "Scenario input type is required", valid: false };
	}

	const config = scenario.inputConfig as Record<string, unknown> | undefined;
	if (!config || typeof config !== "object") {
		return { error: "Scenario input config is required", valid: false };
	}

	return validateScenarioInputConfig(scenario.inputType, config);
}

export function validateVodForPublishing(
	vod: { durationSeconds: number },
	scenariosList: ReadonlyArray<typeof scenarios.$inferSelect>,
): { error?: string; valid: boolean } {
	if (!scenariosList || scenariosList.length === 0) {
		return {
			error: "Cannot publish a VOD with zero scenarios",
			valid: false,
		};
	}

	for (const scenario of scenariosList) {
		const validation = validateScenarioConfig(scenario);
		if (!validation.valid) {
			return {
				error: `Invalid scenario configuration: ${validation.error}`,
				valid: false,
			};
		}
		if (scenario.timestampSeconds > vod.durationSeconds) {
			return {
				error: `Scenario timestamp (${scenario.timestampSeconds}s) exceeds VOD duration (${vod.durationSeconds}s)`,
				valid: false,
			};
		}
	}

	return { valid: true };
}

export async function getPublishedVods(context?: DbContext) {
	const db = await getDb(context);

	return db.query.vods.findMany({
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
}

export async function getAdminVods(
	options: GetAdminVodsOptions = {},
	context?: DbContext,
) {
	const db = await getDb(context);
	const { isPublished, limit, offset, role, search } = options;

	return db.query.vods.findMany({
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
}

export async function getVodById(id: string, context?: DbContext) {
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

	return vod ?? null;
}

export async function createVod(
	input: CreateVodInput,
	context?: DbContext,
): Promise<CreateVodResult> {
	if (input.isPublished === true) {
		return {
			error: "Cannot publish a VOD with zero scenarios",
			success: false,
		};
	}

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
		return {
			error: "Failed to create VOD",
			success: false,
		};
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

	return {
		success: true,
		vod,
	};
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

export async function updateVod(
	input: UpdateVodInput,
	context?: DbContext,
): Promise<UpdateVodResult> {
	const existing = await getVodById(input.id, context);
	if (!existing) {
		return {
			error: "VOD not found",
			success: false,
		};
	}

	const willBePublished =
		input.isPublished !== undefined ? input.isPublished : existing.isPublished;

	if (willBePublished) {
		const targetDuration = input.durationSeconds ?? existing.durationSeconds;
		const validation = validateVodForPublishing(
			{ durationSeconds: targetDuration },
			existing.scenarios,
		);
		if (!validation.valid) {
			return {
				error: validation.error,
				success: false,
			};
		}
	}

	const db = await getDb(context);
	const updateValues = extractVodUpdateValues(input);

	const [updatedVod] = await db
		.update(vods)
		.set(updateValues)
		.where(eq(vods.id, input.id))
		.returning();

	await recordVodUpdateAudits(input, existing, updateValues, context);

	return {
		success: true,
		vod: updatedVod,
	};
}

export async function deleteVod(
	input: DeleteVodInput,
	context?: DbContext,
): Promise<DeleteVodResult> {
	const existing = await getVodById(input.id, context);
	if (!existing) {
		return {
			error: "VOD not found",
			success: false,
		};
	}

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

	return { success: true };
}

export async function setVodPublicationStatus(
	input: SetVodPublicationStatusInput,
	context?: DbContext,
): Promise<SetVodPublicationStatusResult> {
	return updateVod(
		{
			actorUserId: input.actorUserId,
			id: input.id,
			isPublished: input.isPublished,
		},
		context,
	);
}

export async function bulkPublishVods(
	input: {
		actorUserId?: string | null;
		ids: string[];
		isPublished: boolean;
	},
	context?: DbContext,
): Promise<BulkOperationResult> {
	const succeeded: string[] = [];
	const failed: Array<{ error: string; id: string }> = [];

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
			failed.push({
				error: String(result.error),
				id,
			});
		}
	}

	return { failed, succeeded };
}

export async function bulkDeleteVods(
	input: {
		actorUserId?: string | null;
		ids: string[];
	},
	context?: DbContext,
): Promise<BulkOperationResult> {
	const succeeded: string[] = [];
	const failed: Array<{ error: string; id: string }> = [];

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
			failed.push({
				error: String(result.error),
				id,
			});
		}
	}

	return { failed, succeeded };
}

export async function getScenarioById(id: string, context?: DbContext) {
	const db = await getDb(context);
	const scenario = await db.query.scenarios.findFirst({
		where: (table, { eq }) => eq(table.id, id),
	});
	return scenario ?? null;
}

export async function getScenariosByVodId(vodId: string, context?: DbContext) {
	const db = await getDb(context);
	return db.query.scenarios.findMany({
		orderBy: (table, { asc }) => [asc(table.timestampSeconds)],
		where: (table, { eq }) => eq(table.vodId, vodId),
	});
}

export async function createScenario(
	input: CreateScenarioInput,
	context?: DbContext,
): Promise<CreateScenarioResult> {
	const validation = validateScenarioConfig(input);
	if (!validation.valid) {
		return {
			error: validation.error,
			success: false,
		};
	}

	const vod = await getVodById(input.vodId, context);
	if (!vod) {
		return {
			error: "VOD not found",
			success: false,
		};
	}

	if (input.timestampSeconds > vod.durationSeconds) {
		return {
			error: `Scenario timestamp (${input.timestampSeconds}s) exceeds VOD duration (${vod.durationSeconds}s)`,
			success: false,
		};
	}

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
		return {
			error: "Failed to create scenario",
			success: false,
		};
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

	return {
		scenario,
		success: true,
	};
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

export async function updateScenario(
	input: UpdateScenarioInput,
	context?: DbContext,
): Promise<UpdateScenarioResult> {
	const existing = await getScenarioById(input.id, context);
	if (!existing) {
		return {
			error: "Scenario not found",
			success: false,
		};
	}

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
	if (!validation.valid) {
		return {
			error: validation.error,
			success: false,
		};
	}

	const db = await getDb(context);
	const updateValues = extractScenarioUpdateValues(input);

	const [updatedScenario] = await db
		.update(scenarios)
		.set(updateValues)
		.where(eq(scenarios.id, input.id))
		.returning();

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

	return {
		scenario: updatedScenario,
		success: true,
	};
}

export async function deleteScenario(
	input: DeleteScenarioInput,
	context?: DbContext,
): Promise<DeleteScenarioResult> {
	const existing = await getScenarioById(input.id, context);
	if (!existing) {
		return {
			error: "Scenario not found",
			success: false,
		};
	}

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

	return { success: true };
}

export async function reorderScenarios(
	input: ReorderScenariosInput,
	context?: DbContext,
): Promise<ReorderScenariosResult> {
	const vod = await getVodById(input.vodId, context);
	if (!vod) {
		return {
			error: "VOD not found",
			success: false,
		};
	}

	const existingScenarioIds = new Set(vod.scenarios.map((s) => s.id));
	for (const order of input.scenarioOrders) {
		if (!existingScenarioIds.has(order.id)) {
			return {
				error: `Scenario ${order.id} does not belong to VOD ${input.vodId}`,
				success: false,
			};
		}
		if (
			typeof order.timestampSeconds !== "number" ||
			order.timestampSeconds < 0 ||
			!Number.isFinite(order.timestampSeconds)
		) {
			return {
				error: "Scenario timestamp must be a non-negative number",
				success: false,
			};
		}
	}

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

	return { success: true };
}

export async function getSessionManifest(
	id: string,
	options: GetSessionManifestOptions = {},
	context?: DbContext,
) {
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
						: modules !== undefined
							? modules.length > 0
								? (scenariosTable, { inArray }) =>
										inArray(scenariosTable.moduleType, modules)
								: undefined
							: undefined,
			},
		},
	});

	if (!vod) {
		return null;
	}

	return vod;
}
