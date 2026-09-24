import { getDb } from "@/shared/db/index.server";
import type { VodCatalogItem } from "../model/vod-types";
import { vodCatalogSchema } from "../model/vod-validation";

export async function publishedVodListHandler(db = getDb()) {
	const rows = await db.query.vods.findMany({
		where: { isPublished: true },
		orderBy: { createdAt: "desc" },
		columns: {
			id: true,
			title: true,
			durationSeconds: true,
		},
		with: {
			questions: {
				columns: {},
				with: {
					skill: {
						columns: { id: true, name: true, slug: true },
					},
				},
			},
		},
	});

	const catalog: VodCatalogItem[] = rows.map((row) => {
		const uniqueSkills = new Map(
			row.questions.flatMap(({ skill }) =>
				skill ? [[skill.id, skill] as const] : [],
			),
		);

		return {
			id: row.id,
			title: row.title,
			durationSeconds: row.durationSeconds,
			questionCount: row.questions.length,
			skills: [...uniqueSkills.values()],
		};
	});

	return vodCatalogSchema.parse(catalog);
}
