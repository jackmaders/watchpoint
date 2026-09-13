import { createServerFn } from "@tanstack/react-start";
import { requirePermission } from "@/shared/lib/permissions";
import {
	type AdminVodItem,
	type BulkDeleteVodsResult,
	BulkDeleteVodsSchema,
	type BulkPublishVodsResult,
	BulkPublishVodsSchema,
	bulkDeleteVodsRule,
	bulkPublishVodsRule,
	type CreateScenarioResult,
	CreateScenarioSchema,
	type CreateVodResult,
	CreateVodSchema,
	createScenarioRule,
	createVodRule,
	type DeleteScenarioResult,
	DeleteScenarioSchema,
	type DeleteVodResult,
	DeleteVodSchema,
	deleteScenarioRule,
	deleteVodRule,
	GetAdminVodByIdSchema,
	GetAdminVodsQuerySchema,
	getAdminVodByIdRule,
	getAdminVodsRule,
	type ReorderScenariosResult,
	ReorderScenariosSchema,
	reorderScenariosRule,
	type ScenarioItem,
	type SetVodPublicationStatusResult,
	SetVodPublicationStatusSchema,
	setVodPublicationStatusRule,
	type UpdateScenarioResult,
	UpdateScenarioSchema,
	type UpdateVodResult,
	UpdateVodSchema,
	updateScenarioRule,
	updateVodRule,
	type VodItem,
} from "../model";

export const getAdminVods = createServerFn({ method: "GET" })
	.validator((data: unknown) => {
		const parsed = GetAdminVodsQuerySchema.safeParse(data ?? {});
		if (!parsed.success) {
			throw new Error("Invalid query payload");
		}
		return parsed.data;
	})
	.handler(async ({ data }): Promise<AdminVodItem[]> => {
		await requirePermission("catalog:manage");
		return getAdminVodsRule(data);
	});

export const getAdminVodById = createServerFn({ method: "GET" })
	.validator((data: unknown) => {
		const parsed = GetAdminVodByIdSchema.safeParse(data);
		if (!parsed.success) {
			throw new Error("Invalid VOD ID payload");
		}
		return parsed.data;
	})
	.handler(
		async ({
			data,
		}): Promise<(VodItem & { scenarios: ScenarioItem[] }) | null> => {
			await requirePermission("catalog:manage");
			return getAdminVodByIdRule(data);
		},
	);

export const createVod = createServerFn({ method: "POST" })
	.validator((data: unknown) => {
		const parsed = CreateVodSchema.safeParse(data);
		if (!parsed.success) {
			throw new Error("Invalid create VOD payload");
		}
		return parsed.data;
	})
	.handler(async ({ data }): Promise<CreateVodResult> => {
		const actor = await requirePermission("catalog:manage");
		return createVodRule({
			...data,
			actorUserId: actor.id,
		});
	});

export const updateVod = createServerFn({ method: "POST" })
	.validator((data: unknown) => {
		const parsed = UpdateVodSchema.safeParse(data);
		if (!parsed.success) {
			throw new Error("Invalid update VOD payload");
		}
		return parsed.data;
	})
	.handler(async ({ data }): Promise<UpdateVodResult> => {
		const permission =
			data.isPublished !== undefined ? "catalog:publish" : "catalog:manage";
		const actor = await requirePermission(permission);
		return updateVodRule({
			...data,
			actorUserId: actor.id,
		});
	});

export const deleteVod = createServerFn({ method: "POST" })
	.validator((data: unknown) => {
		const parsed = DeleteVodSchema.safeParse(data);
		if (!parsed.success) {
			throw new Error("Invalid delete VOD payload");
		}
		return parsed.data;
	})
	.handler(async ({ data }): Promise<DeleteVodResult> => {
		const actor = await requirePermission("catalog:manage");
		return deleteVodRule({
			actorUserId: actor.id,
			id: data.id,
		});
	});

export const setVodPublicationStatus = createServerFn({ method: "POST" })
	.validator((data: unknown) => {
		const parsed = SetVodPublicationStatusSchema.safeParse(data);
		if (!parsed.success) {
			throw new Error("Invalid publication status payload");
		}
		return parsed.data;
	})
	.handler(async ({ data }): Promise<SetVodPublicationStatusResult> => {
		const actor = await requirePermission("catalog:publish");
		return setVodPublicationStatusRule({
			actorUserId: actor.id,
			id: data.id,
			isPublished: data.isPublished,
		});
	});

export const bulkPublishVods = createServerFn({ method: "POST" })
	.validator((data: unknown) => {
		const parsed = BulkPublishVodsSchema.safeParse(data);
		if (!parsed.success) {
			throw new Error("Invalid bulk publish payload");
		}
		return parsed.data;
	})
	.handler(async ({ data }): Promise<BulkPublishVodsResult> => {
		const actor = await requirePermission("catalog:publish");
		return bulkPublishVodsRule({
			actorUserId: actor.id,
			ids: data.ids,
			isPublished: data.isPublished,
		});
	});

export const bulkDeleteVods = createServerFn({ method: "POST" })
	.validator((data: unknown) => {
		const parsed = BulkDeleteVodsSchema.safeParse(data);
		if (!parsed.success) {
			throw new Error("Invalid bulk delete payload");
		}
		return parsed.data;
	})
	.handler(async ({ data }): Promise<BulkDeleteVodsResult> => {
		const actor = await requirePermission("catalog:manage");
		return bulkDeleteVodsRule({
			actorUserId: actor.id,
			ids: data.ids,
		});
	});

export const createScenario = createServerFn({ method: "POST" })
	.validator((data: unknown) => {
		const parsed = CreateScenarioSchema.safeParse(data);
		if (!parsed.success) {
			throw new Error("Invalid create scenario payload");
		}
		return parsed.data;
	})
	.handler(async ({ data }): Promise<CreateScenarioResult> => {
		const actor = await requirePermission("catalog:manage");
		return createScenarioRule({
			...data,
			actorUserId: actor.id,
		});
	});

export const updateScenario = createServerFn({ method: "POST" })
	.validator((data: unknown) => {
		const parsed = UpdateScenarioSchema.safeParse(data);
		if (!parsed.success) {
			throw new Error("Invalid update scenario payload");
		}
		return parsed.data;
	})
	.handler(async ({ data }): Promise<UpdateScenarioResult> => {
		const actor = await requirePermission("catalog:manage");
		return updateScenarioRule({
			...data,
			actorUserId: actor.id,
		});
	});

export const deleteScenario = createServerFn({ method: "POST" })
	.validator((data: unknown) => {
		const parsed = DeleteScenarioSchema.safeParse(data);
		if (!parsed.success) {
			throw new Error("Invalid delete scenario payload");
		}
		return parsed.data;
	})
	.handler(async ({ data }): Promise<DeleteScenarioResult> => {
		const actor = await requirePermission("catalog:manage");
		return deleteScenarioRule({
			actorUserId: actor.id,
			id: data.id,
		});
	});

export const reorderScenarios = createServerFn({ method: "POST" })
	.validator((data: unknown) => {
		const parsed = ReorderScenariosSchema.safeParse(data);
		if (!parsed.success) {
			throw new Error("Invalid reorder scenarios payload");
		}
		return parsed.data;
	})
	.handler(async ({ data }): Promise<ReorderScenariosResult> => {
		const actor = await requirePermission("catalog:manage");
		return reorderScenariosRule({
			actorUserId: actor.id,
			scenarioOrders: data.scenarioOrders,
			vodId: data.vodId,
		});
	});
