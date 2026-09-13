/**
 * Type definitions, schemas, and discriminated union results for administrative VOD and scenario operations.
 *
 * Defines input schemas, entity representations, and result structures for admin-vod-editor model rules.
 */

import { z } from "zod";
import {
	heroRoleEnum,
	inputTypeEnum,
	moduleTypeEnum,
	type scenarios,
	type vods,
} from "@/shared/db";

export {
	heroRoleEnum,
	inputTypeEnum,
	moduleTypeEnum,
	validateVodForPublishing,
} from "@/shared/db";
export type HeroRole = (typeof heroRoleEnum)[number];
export type ModuleType = (typeof moduleTypeEnum)[number];
export type InputType = (typeof inputTypeEnum)[number];

export type VodItem = typeof vods.$inferSelect;
export type ScenarioItem = typeof scenarios.$inferSelect;

export interface AuditEntryItem {
	action: string;
	actor?: { email?: string | null; name?: string | null } | null;
	actorUserId?: string | null;
	createdAt: Date;
	entityId: string;
	entityType: string;
	id: string;
	metadata?: unknown;
}

export type AdminVodItem = VodItem & {
	scenarios: Array<{ id: string }>;
};

export type PublishedVodItem = VodItem & {
	scenarios: Array<{ id: string }>;
};

export type SessionManifest = VodItem & {
	scenarios: ScenarioItem[];
};

export interface BulkOperationResult {
	failed: Array<{ error: string; id: string }>;
	succeeded: string[];
}

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

// Rule Result Types (Discriminated Unions)
export type CreateVodResult =
	| { status: "success"; vod: VodItem }
	| { status: "rejected"; reason: string };

export type UpdateVodResult =
	| { status: "success"; vod: VodItem }
	| { status: "rejected"; reason: string };

export type DeleteVodResult =
	| { status: "success"; vod: VodItem }
	| { status: "rejected"; reason: string };

export type SetVodPublicationStatusResult =
	| { status: "success"; vod: VodItem }
	| { status: "rejected"; reason: string };

export type BulkPublishVodsResult =
	| { result: BulkOperationResult; status: "success" }
	| { reason: string; status: "rejected" };

export type BulkDeleteVodsResult =
	| { result: BulkOperationResult; status: "success" }
	| { reason: string; status: "rejected" };

export type CreateScenarioResult =
	| { scenario: ScenarioItem; status: "success" }
	| { reason: string; status: "rejected" };

export type UpdateScenarioResult =
	| { scenario: ScenarioItem; status: "success" }
	| { reason: string; status: "rejected" };

export type DeleteScenarioResult =
	| { scenario: ScenarioItem; status: "success" }
	| { reason: string; status: "rejected" };

export type ReorderScenariosResult =
	| { status: "success" }
	| { reason: string; status: "rejected" };
