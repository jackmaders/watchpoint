/**
 * Business rules and validation logic for administrative VOD creation, updates, and deletions.
 *
 * Implements `createVodRule`, `updateVodRule`, `deleteVodRule`, `setVodPublicationStatusRule`,
 * `bulkPublishVodsRule`, and `bulkDeleteVodsRule` with zero exceptions and discriminated union results.
 */

import {
	createAuditEntry,
	createVod,
	deleteVod,
	getVodById,
	type JsonValue,
	queryScenarios,
	updateVod,
	validateVodForPublishing,
} from "@/shared/db";
import type {
	BulkDeleteVodsPayload,
	BulkDeleteVodsResult,
	BulkPublishVodsPayload,
	BulkPublishVodsResult,
	CreateVodPayload,
	CreateVodResult,
	DeleteVodPayload,
	DeleteVodResult,
	SetVodPublicationStatusPayload,
	SetVodPublicationStatusResult,
	UpdateVodPayload,
	UpdateVodResult,
} from "./types";

export interface ActorContext {
	actorUserId?: string | null;
}

export async function createVodRule(
	input: CreateVodPayload & ActorContext,
	db?: Parameters<typeof createVod>[1],
): Promise<CreateVodResult> {
	if ((input as { isPublished?: boolean }).isPublished === true) {
		return {
			reason: "Cannot publish a VOD with zero scenarios",
			status: "rejected",
		};
	}

	const created = await createVod(
		{
			durationSeconds: input.durationSeconds,
			heroName: input.heroName,
			isPublished: false,
			mapName: input.mapName,
			rankTier: input.rankTier,
			role: input.role,
			title: input.title,
			youtubeVideoId: input.youtubeVideoId,
		},
		db,
	);

	if (!created) {
		return { reason: "Failed to create VOD", status: "rejected" };
	}

	await createAuditEntry(
		{
			action: "VOD_CREATED",
			actorUserId: input.actorUserId,
			entityId: created.id,
			entityType: "VOD",
			metadata: {
				durationSeconds: created.durationSeconds,
				heroName: created.heroName,
				isPublished: created.isPublished,
				mapName: created.mapName,
				rankTier: created.rankTier,
				role: created.role,
				title: created.title,
				youtubeVideoId: created.youtubeVideoId,
			},
		},
		db,
	);

	return { status: "success", vod: created };
}

function getVodUpdateValues(
	input: UpdateVodPayload,
): Parameters<typeof updateVod>[1] {
	const values: Parameters<typeof updateVod>[1] = {};
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
	input: UpdateVodPayload & ActorContext,
	existing: NonNullable<Awaited<ReturnType<typeof getVodById>>>,
	updateValues: Parameters<typeof updateVod>[1],
	db?: Parameters<typeof updateVod>[2],
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
			db,
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
					updatedFields: updateValues as unknown as JsonValue,
				},
			},
			db,
		);
	}
}

export async function updateVodRule(
	input: UpdateVodPayload & ActorContext,
	db?: Parameters<typeof updateVod>[2],
): Promise<UpdateVodResult> {
	const existing = await getVodById(input.id, db);
	if (!existing) {
		return { reason: "VOD not found", status: "rejected" };
	}

	const willBePublished = input.isPublished ?? existing.isPublished;
	if (willBePublished) {
		const targetDuration = input.durationSeconds ?? existing.durationSeconds;
		const scenariosList = await queryScenarios(
			{ filter: { vodId: input.id } },
			db,
		);
		const validation = validateVodForPublishing(
			{ durationSeconds: targetDuration },
			scenariosList,
		);
		if (!validation.valid) {
			return {
				reason: validation.error ?? "Invalid publishing state",
				status: "rejected",
			};
		}
	}

	const updateValues = getVodUpdateValues(input);
	const updated = await updateVod(input.id, updateValues, db);
	if (!updated) {
		return { reason: "Failed to update VOD", status: "rejected" };
	}

	await recordVodUpdateAudits(input, existing, updateValues, db);
	return { status: "success", vod: updated };
}

export async function deleteVodRule(
	input: DeleteVodPayload & ActorContext,
	db?: Parameters<typeof deleteVod>[1],
): Promise<DeleteVodResult> {
	const existing = await getVodById(input.id, db);
	if (!existing) {
		return { reason: "VOD not found", status: "rejected" };
	}

	const deleted = await deleteVod(input.id, db);
	if (!deleted) {
		return { reason: "Failed to delete VOD", status: "rejected" };
	}

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
		db,
	);

	return { status: "success", vod: existing };
}

export async function setVodPublicationStatusRule(
	input: SetVodPublicationStatusPayload & ActorContext,
	db?: Parameters<typeof updateVod>[2],
): Promise<SetVodPublicationStatusResult> {
	return updateVodRule(
		{
			actorUserId: input.actorUserId,
			id: input.id,
			isPublished: input.isPublished,
		},
		db,
	);
}

export async function bulkPublishVodsRule(
	input: BulkPublishVodsPayload & ActorContext,
	db?: Parameters<typeof updateVod>[2],
): Promise<BulkPublishVodsResult> {
	const failed: Array<{ error: string; id: string }> = [];
	const succeeded: string[] = [];

	for (const id of input.ids) {
		const result = await setVodPublicationStatusRule(
			{
				actorUserId: input.actorUserId,
				id,
				isPublished: input.isPublished,
			},
			db,
		);

		if (result.status === "success") {
			succeeded.push(id);
		} else {
			failed.push({ error: result.reason, id });
		}
	}

	return {
		result: { failed, succeeded },
		status: "success",
	};
}

export async function bulkDeleteVodsRule(
	input: BulkDeleteVodsPayload & ActorContext,
	db?: Parameters<typeof deleteVod>[1],
): Promise<BulkDeleteVodsResult> {
	const failed: Array<{ error: string; id: string }> = [];
	const succeeded: string[] = [];

	for (const id of input.ids) {
		const result = await deleteVodRule(
			{
				actorUserId: input.actorUserId,
				id,
			},
			db,
		);

		if (result.status === "success") {
			succeeded.push(id);
		} else {
			failed.push({ error: result.reason, id });
		}
	}

	return {
		result: { failed, succeeded },
		status: "success",
	};
}
