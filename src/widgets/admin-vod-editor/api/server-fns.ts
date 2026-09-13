import {
	queryOptions,
	useMutation,
	useQueryClient,
} from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { queryKeys } from "@/shared/api";
import { requirePermission } from "@/shared/lib/permissions";
import {
	type AdminVodItem,
	type BulkDeleteVodsPayload,
	type BulkDeleteVodsResult,
	BulkDeleteVodsSchema,
	type BulkPublishVodsPayload,
	type BulkPublishVodsResult,
	BulkPublishVodsSchema,
	bulkDeleteVodsRule,
	bulkPublishVodsRule,
	type CreateScenarioPayload,
	type CreateScenarioResult,
	CreateScenarioSchema,
	type CreateVodPayload,
	type CreateVodResult,
	CreateVodSchema,
	createScenarioRule,
	createVodRule,
	type DeleteScenarioPayload,
	type DeleteScenarioResult,
	DeleteScenarioSchema,
	type DeleteVodPayload,
	type DeleteVodResult,
	DeleteVodSchema,
	deleteScenarioRule,
	deleteVodRule,
	GetAdminVodByIdSchema,
	type GetAdminVodsQueryPayload,
	GetAdminVodsQuerySchema,
	getAdminVodByIdRule,
	getAdminVodsRule,
	type ReorderScenariosPayload,
	type ReorderScenariosResult,
	ReorderScenariosSchema,
	reorderScenariosRule,
	type ScenarioItem,
	type SetVodPublicationStatusPayload,
	type SetVodPublicationStatusResult,
	SetVodPublicationStatusSchema,
	setVodPublicationStatusRule,
	type UpdateScenarioPayload,
	type UpdateScenarioResult,
	UpdateScenarioSchema,
	type UpdateVodPayload,
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

// --- Query Options & Mutation Hooks ---

export const adminVodsQueryOptions = (params?: GetAdminVodsQueryPayload) =>
	queryOptions({
		queryFn: () => getAdminVods({ data: params }),
		queryKey: params ? [...queryKeys.adminVods, params] : queryKeys.adminVods,
	});

export const adminVodByIdQueryOptions = (id: string) =>
	queryOptions({
		queryFn: () => getAdminVodById({ data: { id } }),
		queryKey: [...queryKeys.adminVods, id],
	});

export function useCreateVod() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (data: CreateVodPayload) => createVod({ data }),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: queryKeys.adminVods });
			queryClient.invalidateQueries({ queryKey: queryKeys.vods });
		},
	});
}

export function useUpdateVod() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (data: UpdateVodPayload) => updateVod({ data }),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: queryKeys.adminVods });
			queryClient.invalidateQueries({ queryKey: queryKeys.vods });
		},
	});
}

export function useDeleteVod() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (data: DeleteVodPayload) => deleteVod({ data }),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: queryKeys.adminVods });
			queryClient.invalidateQueries({ queryKey: queryKeys.vods });
		},
	});
}

export function useSetVodPublicationStatus() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (data: SetVodPublicationStatusPayload) =>
			setVodPublicationStatus({ data }),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: queryKeys.adminVods });
			queryClient.invalidateQueries({ queryKey: queryKeys.vods });
		},
	});
}

export function useBulkPublishVods() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (data: BulkPublishVodsPayload) => bulkPublishVods({ data }),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: queryKeys.adminVods });
			queryClient.invalidateQueries({ queryKey: queryKeys.vods });
		},
	});
}

export function useBulkDeleteVods() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (data: BulkDeleteVodsPayload) => bulkDeleteVods({ data }),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: queryKeys.adminVods });
			queryClient.invalidateQueries({ queryKey: queryKeys.vods });
		},
	});
}

export function useCreateScenario() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (data: CreateScenarioPayload) => createScenario({ data }),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: queryKeys.adminVods });
			queryClient.invalidateQueries({ queryKey: queryKeys.scenarios });
			queryClient.invalidateQueries({ queryKey: queryKeys.vods });
		},
	});
}

export function useUpdateScenario() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (data: UpdateScenarioPayload) => updateScenario({ data }),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: queryKeys.adminVods });
			queryClient.invalidateQueries({ queryKey: queryKeys.scenarios });
			queryClient.invalidateQueries({ queryKey: queryKeys.vods });
		},
	});
}

export function useDeleteScenario() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (data: DeleteScenarioPayload) => deleteScenario({ data }),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: queryKeys.adminVods });
			queryClient.invalidateQueries({ queryKey: queryKeys.scenarios });
			queryClient.invalidateQueries({ queryKey: queryKeys.vods });
		},
	});
}

export function useReorderScenarios() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (data: ReorderScenariosPayload) => reorderScenarios({ data }),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: queryKeys.adminVods });
			queryClient.invalidateQueries({ queryKey: queryKeys.scenarios });
			queryClient.invalidateQueries({ queryKey: queryKeys.vods });
		},
	});
}
