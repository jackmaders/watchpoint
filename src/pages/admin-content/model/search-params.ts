import { z } from "zod";
import { heroRoleEnum } from "@/shared/db";

export const contentPublicationStatusEnum = [
	"ALL",
	"PUBLISHED",
	"DRAFT",
] as const;
export type ContentPublicationStatus =
	(typeof contentPublicationStatusEnum)[number];

export const contentHeroRoleFilterEnum = ["ALL", ...heroRoleEnum] as const;
export type ContentHeroRoleFilter = (typeof contentHeroRoleFilterEnum)[number];

export const contentSortColumnEnum = [
	"title",
	"heroName",
	"role",
	"mapName",
	"durationSeconds",
	"scenarioCount",
	"isPublished",
	"createdAt",
] as const;
export type ContentSortColumn = (typeof contentSortColumnEnum)[number];

export const contentSortOrderEnum = ["asc", "desc"] as const;
export type ContentSortOrder = (typeof contentSortOrderEnum)[number];

export const contentSearchSchema = z.object({
	role: z.enum(contentHeroRoleFilterEnum).optional(),
	search: z.string().optional(),
	sortBy: z.enum(contentSortColumnEnum).optional(),
	sortOrder: z.enum(contentSortOrderEnum).optional(),
	status: z.enum(contentPublicationStatusEnum).optional(),
});

export type ContentSearchParams = z.infer<typeof contentSearchSchema>;

export function validateContentSearch(
	search?: Record<string, unknown>,
): ContentSearchParams {
	if (!search || typeof search !== "object") {
		return {};
	}
	const parsed = contentSearchSchema.safeParse(search);
	if (parsed.success) {
		return parsed.data;
	}
	return {};
}

export function toGetAdminVodsQuery(params: ContentSearchParams) {
	const isPublished =
		params.status === "PUBLISHED"
			? true
			: params.status === "DRAFT"
				? false
				: undefined;
	const role = params.role && params.role !== "ALL" ? params.role : undefined;
	return {
		isPublished,
		role,
		search: params.search,
	};
}
