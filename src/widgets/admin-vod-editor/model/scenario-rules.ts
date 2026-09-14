/**
 * Business rules and validation logic for scenario authoring, edits, deletion, and timeline reordering.
 *
 * Implements `createScenarioRule`, `updateScenarioRule`, `deleteScenarioRule`, and `reorderScenariosRule`
 * with zero exceptions and discriminated union results.
 */

import {
	createAuditEntry,
	createScenario,
	deleteScenario,
	getVodById,
	queryScenarios,
	reorderScenarios,
	updateScenario,
} from "@/shared/db";
import type {
	CreateScenarioPayload,
	CreateScenarioResult,
	DeleteScenarioPayload,
	DeleteScenarioResult,
	ReorderScenariosPayload,
	ReorderScenariosResult,
	ScenarioItem,
	UpdateScenarioPayload,
	UpdateScenarioResult,
} from "./types";
import { validateScenarioConfig } from "./validation";
import type { ActorContext } from "./vod-rules";

export async function createScenarioRule(
	input: CreateScenarioPayload & ActorContext,
	db?: Parameters<typeof createScenario>[1],
): Promise<CreateScenarioResult> {
	const validation = validateScenarioConfig(input);
	if (!validation.valid) {
		return {
			reason: validation.error ?? "Invalid scenario configuration",
			status: "rejected",
		};
	}

	const vod = await getVodById(input.vodId, db);
	if (!vod) {
		return { reason: "VOD not found", status: "rejected" };
	}

	if (input.timestampSeconds > vod.durationSeconds) {
		return {
			reason: `Scenario timestamp (${input.timestampSeconds}s) exceeds VOD duration (${vod.durationSeconds}s)`,
			status: "rejected",
		};
	}

	const created = await createScenario(
		{
			explanationText: input.explanationText,
			imageUrl: input.imageUrl ?? null,
			inputConfig: input.inputConfig,
			inputType: input.inputType,
			moduleType: input.moduleType,
			promptText: input.promptText,
			timeLimitSeconds: input.timeLimitSeconds ?? null,
			timestampSeconds: input.timestampSeconds,
			vodId: input.vodId,
		},
		db,
	);

	if (!created) {
		return { reason: "Failed to create scenario", status: "rejected" };
	}

	await createAuditEntry(
		{
			action: "SCENARIO_CREATED",
			actorUserId: input.actorUserId,
			entityId: created.id,
			entityType: "SCENARIO",
			metadata: {
				inputType: created.inputType,
				moduleType: created.moduleType,
				promptText: created.promptText,
				timestampSeconds: created.timestampSeconds,
				vodId: created.vodId,
			},
		},
		db,
	);

	return { scenario: created, status: "success" };
}

function getMergedScenarioConfig(
	input: UpdateScenarioPayload,
	existing: ScenarioItem,
) {
	return {
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
}

function getScenarioUpdateValues(
	input: UpdateScenarioPayload,
): Parameters<typeof updateScenario>[1] {
	const values: Parameters<typeof updateScenario>[1] = {};
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

export async function updateScenarioRule(
	input: UpdateScenarioPayload & ActorContext,
	db?: Parameters<typeof updateScenario>[2],
): Promise<UpdateScenarioResult> {
	const [existing] = await queryScenarios({ filter: { id: input.id } }, db);
	if (!existing) {
		return { reason: "Scenario not found", status: "rejected" };
	}

	const mergedConfig = getMergedScenarioConfig(input, existing);
	const validation = validateScenarioConfig(mergedConfig);
	if (!validation.valid) {
		return {
			reason: validation.error ?? "Invalid scenario configuration",
			status: "rejected",
		};
	}

	const updateValues = getScenarioUpdateValues(input);
	const updated = await updateScenario(input.id, updateValues, db);
	if (!updated) {
		return { reason: "Failed to update scenario", status: "rejected" };
	}

	await createAuditEntry(
		{
			action: "SCENARIO_UPDATED",
			actorUserId: input.actorUserId,
			entityId: input.id,
			entityType: "SCENARIO",
			metadata: {
				updatedFields: updateValues,
			},
		},
		db,
	);

	return { scenario: updated, status: "success" };
}

export async function deleteScenarioRule(
	input: DeleteScenarioPayload & ActorContext,
	db?: Parameters<typeof deleteScenario>[1],
): Promise<DeleteScenarioResult> {
	const [existing] = await queryScenarios({ filter: { id: input.id } }, db);
	if (!existing) {
		return { reason: "Scenario not found", status: "rejected" };
	}

	const deleted = await deleteScenario(input.id, db);
	if (!deleted) {
		return { reason: "Failed to delete scenario", status: "rejected" };
	}

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
		db,
	);

	return { scenario: existing, status: "success" };
}

export async function reorderScenariosRule(
	input: ReorderScenariosPayload & ActorContext,
	db?: Parameters<typeof reorderScenarios>[1],
): Promise<ReorderScenariosResult> {
	const vod = await getVodById(input.vodId, db);
	if (!vod) {
		return { reason: "VOD not found", status: "rejected" };
	}

	const vodScenarios = await queryScenarios(
		{ filter: { vodId: input.vodId } },
		db,
	);
	const existingScenarioIds = new Set(vodScenarios.map((s) => s.id));

	for (const order of input.scenarioOrders) {
		if (!existingScenarioIds.has(order.id)) {
			return {
				reason: `Scenario ${order.id} does not belong to VOD ${input.vodId}`,
				status: "rejected",
			};
		}
		if (
			typeof order.timestampSeconds !== "number" ||
			order.timestampSeconds < 0 ||
			!Number.isFinite(order.timestampSeconds)
		) {
			return {
				reason: "Scenario timestamp must be a non-negative number",
				status: "rejected",
			};
		}
	}

	await reorderScenarios(input.scenarioOrders, db);

	await createAuditEntry(
		{
			action: "SCENARIOS_REORDERED",
			actorUserId: input.actorUserId,
			entityId: input.vodId,
			entityType: "VOD",
			metadata: {
				scenarioOrders: input.scenarioOrders,
			},
		},
		db,
	);

	return { status: "success" };
}
