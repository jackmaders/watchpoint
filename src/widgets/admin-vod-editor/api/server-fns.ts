import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
	type AdminVodItem,
	type BulkOperationResult,
	type DbResult,
	heroRoleEnum,
	inputTypeEnum,
	moduleTypeEnum,
	type ScenarioItem,
	type VodItem,
	vodService,
} from "@/shared/db";
import { requirePermission } from "@/shared/lib/permissions";

export const GetAdminVodsQuerySchema = z.object({
	isPublished: z.boolean().optional(),
	limit: z.number().int().positive().optional(),
	offset: z.number().int().nonnegative().optional(),
	role: z.enum(heroRoleEnum).optional(),
	search: z.string().optional(),
});

export type GetAdminVodsQueryPayload = z.infer<typeof GetAdminVodsQuerySchema>;

export const GetAdminVodByIdSchema = z.object({
	id: z.string().min(1),
});

export type GetAdminVodByIdPayload = z.infer<typeof GetAdminVodByIdSchema>;

export const CreateVodSchema = z.object({
	durationSeconds: z.number().int().positive(),
	heroName: z.string().min(1),
	mapName: z.string().min(1),
	rankTier: z.string().min(1),
	role: z.enum(heroRoleEnum),
	title: z.string().min(1),
	youtubeVideoId: z.string().min(1),
});

export type CreateVodPayload = z.infer<typeof CreateVodSchema>;

export const UpdateVodSchema = z.object({
	durationSeconds: z.number().int().positive().optional(),
	heroName: z.string().min(1).optional(),
	id: z.string().min(1),
	isPublished: z.boolean().optional(),
	mapName: z.string().min(1).optional(),
	rankTier: z.string().min(1).optional(),
	role: z.enum(heroRoleEnum).optional(),
	title: z.string().min(1).optional(),
	youtubeVideoId: z.string().min(1).optional(),
});

export type UpdateVodPayload = z.infer<typeof UpdateVodSchema>;

export const DeleteVodSchema = z.object({
	id: z.string().min(1),
});

export type DeleteVodPayload = z.infer<typeof DeleteVodSchema>;

export const SetVodPublicationStatusSchema = z.object({
	id: z.string().min(1),
	isPublished: z.boolean(),
});

export type SetVodPublicationStatusPayload = z.infer<
	typeof SetVodPublicationStatusSchema
>;

export const BulkPublishVodsSchema = z.object({
	ids: z.array(z.string().min(1)).min(1),
	isPublished: z.boolean(),
});

export type BulkPublishVodsPayload = z.infer<typeof BulkPublishVodsSchema>;

export const BulkDeleteVodsSchema = z.object({
	ids: z.array(z.string().min(1)).min(1),
});

export type BulkDeleteVodsPayload = z.infer<typeof BulkDeleteVodsSchema>;

export const CreateScenarioSchema = z.object({
	explanationText: z.string().min(1),
	imageUrl: z.string().nullable().optional(),
	inputConfig: z.record(z.string(), z.any()),
	inputType: z.enum(inputTypeEnum),
	moduleType: z.enum(moduleTypeEnum),
	promptText: z.string().min(1),
	timeLimitSeconds: z.number().int().positive().nullable().optional(),
	timestampSeconds: z.number().nonnegative(),
	vodId: z.string().min(1),
});

export type CreateScenarioPayload = z.infer<typeof CreateScenarioSchema>;

export const UpdateScenarioSchema = z.object({
	explanationText: z.string().min(1).optional(),
	id: z.string().min(1),
	imageUrl: z.string().nullable().optional(),
	inputConfig: z.record(z.string(), z.any()).optional(),
	inputType: z.enum(inputTypeEnum).optional(),
	moduleType: z.enum(moduleTypeEnum).optional(),
	promptText: z.string().min(1).optional(),
	timeLimitSeconds: z.number().int().positive().nullable().optional(),
	timestampSeconds: z.number().nonnegative().optional(),
});

export type UpdateScenarioPayload = z.infer<typeof UpdateScenarioSchema>;

export const DeleteScenarioSchema = z.object({
	id: z.string().min(1),
});

export type DeleteScenarioPayload = z.infer<typeof DeleteScenarioSchema>;

export const ReorderScenariosSchema = z.object({
	scenarioOrders: z
		.array(
			z.object({
				id: z.string().min(1),
				timestampSeconds: z.number().nonnegative(),
			}),
		)
		.min(1),
	vodId: z.string().min(1),
});

export type ReorderScenariosPayload = z.infer<typeof ReorderScenariosSchema>;

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
		const result = await vodService.listAdmin(data);
		if (!result.success) {
			throw new Error(result.error);
		}
		return result.data.items;
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
			const result = await vodService.getById({ id: data.id });
			if (!result.success) {
				throw new Error(result.error);
			}
			return result.data;
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
	.handler(async ({ data }): Promise<DbResult<VodItem>> => {
		const actor = await requirePermission("catalog:manage");
		return vodService.create({
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
	.handler(async ({ data }): Promise<DbResult<VodItem>> => {
		const permission =
			data.isPublished !== undefined ? "catalog:publish" : "catalog:manage";
		const actor = await requirePermission(permission);
		return vodService.update({
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
	.handler(async ({ data }): Promise<DbResult<void>> => {
		const actor = await requirePermission("catalog:manage");
		return vodService.delete({
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
	.handler(async ({ data }): Promise<DbResult<VodItem>> => {
		const actor = await requirePermission("catalog:publish");
		return vodService.setPublicationStatus({
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
	.handler(async ({ data }): Promise<DbResult<BulkOperationResult>> => {
		const actor = await requirePermission("catalog:publish");
		return vodService.bulkPublish({
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
	.handler(async ({ data }): Promise<DbResult<BulkOperationResult>> => {
		const actor = await requirePermission("catalog:manage");
		return vodService.bulkDelete({
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
	.handler(async ({ data }): Promise<DbResult<ScenarioItem>> => {
		const actor = await requirePermission("catalog:manage");
		return vodService.createScenario({
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
	.handler(async ({ data }): Promise<DbResult<ScenarioItem>> => {
		const actor = await requirePermission("catalog:manage");
		return vodService.updateScenario({
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
	.handler(async ({ data }): Promise<DbResult<void>> => {
		const actor = await requirePermission("catalog:manage");
		return vodService.deleteScenario({
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
	.handler(async ({ data }): Promise<DbResult<void>> => {
		const actor = await requirePermission("catalog:manage");
		return vodService.reorderScenarios({
			actorUserId: actor.id,
			scenarioOrders: data.scenarioOrders,
			vodId: data.vodId,
		});
	});
