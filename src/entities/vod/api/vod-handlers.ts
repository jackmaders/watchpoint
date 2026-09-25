import { getDb } from "@/shared/db/index.server";
import type { VodCatalogItem } from "../model/vod-types";
import { vodCatalogSchema } from "../model/vod-validation";

export async function publishedVodListHandler(db = getDb()) {
	const rows = await db.query.vods.findMany({
		where: { isPublished: true },
		orderBy: { createdAt: "desc" },
		with: {
			questions: {
				columns: {},
				with: {
					skill: true,
				},
			},
		},
	});

	const catalog: VodCatalogItem[] = rows.map(({ questions, ...vod }) => {
		const uniqueSkills = new Map(
			questions.flatMap(({ skill }) => {
				if (!skill) {
					return [];
				}
				return [[skill.id, skill] as const];
			}),
		);

		return {
			...vod,
			questionCount: questions.length,
			skills: [...uniqueSkills.values()],
		};
	});

	return vodCatalogSchema.parse(catalog);
}
