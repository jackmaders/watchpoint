import type { AdminVodItem } from "@/shared/db";
import type {
	ContentHeroRoleFilter,
	ContentPublicationStatus,
	ContentSortColumn,
	ContentSortOrder,
} from "./search-params";

export function matchesContentFilters(
	vod: AdminVodItem,
	status: ContentPublicationStatus,
	role: ContentHeroRoleFilter,
	search: string,
): boolean {
	if (status === "PUBLISHED" && !vod.isPublished) return false;
	if (status === "DRAFT" && vod.isPublished) return false;
	if (role !== "ALL" && vod.role !== role) return false;

	const trimmed = search.trim().toLowerCase();
	if (trimmed) {
		const matches =
			vod.title.toLowerCase().includes(trimmed) ||
			vod.heroName.toLowerCase().includes(trimmed) ||
			vod.mapName.toLowerCase().includes(trimmed);
		if (!matches) return false;
	}

	return true;
}

function getContentSortValue(
	vod: AdminVodItem,
	column: ContentSortColumn,
): string | number {
	switch (column) {
		case "title":
			return vod.title;
		case "heroName":
			return vod.heroName;
		case "role":
			return vod.role;
		case "mapName":
			return vod.mapName;
		case "durationSeconds":
			return vod.durationSeconds;
		case "scenarioCount":
			return vod.scenarios?.length ?? 0;
		case "isPublished":
			return vod.isPublished ? 1 : 0;
		case "createdAt":
			return new Date(vod.createdAt).getTime();
	}
}

export function compareContentVods(
	a: AdminVodItem,
	b: AdminVodItem,
	column: ContentSortColumn,
	order: ContentSortOrder,
): number {
	const aVal = getContentSortValue(a, column);
	const bVal = getContentSortValue(b, column);

	if (aVal < bVal) return order === "asc" ? -1 : 1;
	if (aVal > bVal) return order === "asc" ? 1 : -1;
	return 0;
}
