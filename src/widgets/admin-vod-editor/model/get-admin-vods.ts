/**
 * Query resolution logic for administrative VOD list and detail retrieval.
 *
 * Implements `getAdminVodsRule` and `getAdminVodByIdRule` using database query helpers.
 */

import { getVodById, queryScenarios, queryVods } from "@/shared/db";
import type {
	AdminVodItem,
	GetAdminVodByIdPayload,
	GetAdminVodsQueryPayload,
	ScenarioItem,
	VodItem,
} from "./types";

export async function getAdminVodsRule(
	params: GetAdminVodsQueryPayload = {},
	db?: Parameters<typeof queryVods>[1],
): Promise<AdminVodItem[]> {
	const filter: NonNullable<Parameters<typeof queryVods>[0]>["filter"] = {};
	if (params.isPublished !== undefined) {
		filter.isPublished = params.isPublished;
	}
	if (params.role !== undefined) {
		filter.role = params.role;
	}

	const allVods = await queryVods(
		{
			filter: Object.keys(filter).length > 0 ? filter : undefined,
			order: { createdAt: "desc" },
		},
		db,
	);

	let filteredVods = allVods;
	if (params.search?.trim()) {
		const search = params.search.toLowerCase().trim();
		filteredVods = allVods.filter(
			(v) =>
				v.title.toLowerCase().includes(search) ||
				v.heroName.toLowerCase().includes(search) ||
				v.mapName.toLowerCase().includes(search),
		);
	}

	const allScenarios = await queryScenarios({}, db);
	const scenarioCountMap = new Map<string, Array<{ id: string }>>();
	for (const s of allScenarios) {
		const list = scenarioCountMap.get(s.vodId) ?? [];
		list.push({ id: s.id });
		scenarioCountMap.set(s.vodId, list);
	}

	return filteredVods.map((v) => ({
		...v,
		scenarios: scenarioCountMap.get(v.id) ?? [],
	}));
}

export async function getAdminVodByIdRule(
	params: GetAdminVodByIdPayload,
	db?: Parameters<typeof getVodById>[1],
): Promise<(VodItem & { scenarios: ScenarioItem[] }) | null> {
	const vod = await getVodById(params.id, db);
	if (!vod) {
		return null;
	}

	const vodScenarios = await queryScenarios(
		{
			filter: { vodId: params.id },
			order: { timestampSeconds: "asc" },
		},
		db,
	);

	return {
		...vod,
		scenarios: vodScenarios,
	};
}
