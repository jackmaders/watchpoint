import { count, eq, sql } from "drizzle-orm";
import { questions, skills, vods } from "@/shared/db";
import { getDb } from "@/shared/db/index.server";
import type { VodCatalogItem } from "../model/vod-types";
import { vodCatalogSchema } from "../model/vod-validation";

export async function publishedVodListHandler(db = getDb()) {
	const rows = await db
		.select({
			id: vods.id,
			title: vods.title,
			durationSeconds: vods.durationSeconds,
			questionCount: count(questions.id),
			skillId: skills.id,
			skillName: skills.name,
			skillSlug: skills.slug,
		})
		.from(vods)
		.leftJoin(questions, eq(questions.vodId, vods.id))
		.leftJoin(skills, eq(skills.id, questions.skillId))
		.where(eq(vods.isPublished, true))
		.groupBy(
			vods.id,
			vods.title,
			vods.durationSeconds,
			skills.id,
			skills.name,
			skills.slug,
		)
		.orderBy(sql`${vods.createdAt} desc`);

	const catalog = rows.reduce<VodCatalogItem[]>((items, row) => {
		const existing = items.find((item) => item.id === row.id);
		if (existing) {
			existing.questionCount += Number(row.questionCount);
			if (row.skillId && row.skillName && row.skillSlug) {
				existing.skills.push({
					id: row.skillId,
					name: row.skillName,
					slug: row.skillSlug,
				});
			}
			return items;
		}

		items.push({
			id: row.id,
			title: row.title,
			durationSeconds: row.durationSeconds,
			questionCount: Number(row.questionCount),
			skills:
				row.skillId && row.skillName && row.skillSlug
					? [
							{
								id: row.skillId,
								name: row.skillName,
								slug: row.skillSlug,
							},
						]
					: [],
		});
		return items;
	}, []);

	return vodCatalogSchema.parse(catalog);
}
