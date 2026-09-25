import { getDb } from "@/shared/db/index.server";
import type { VodCatalogItem } from "../model/vod-types";
import {
	vodCatalogColumns,
	vodCatalogSchema,
	vodCatalogSkillColumns,
} from "../model/vod-validation";

export async function publishedVodListHandler(db = getDb()) {
	const rows = await db.query.vods.findMany({
		where: { isPublished: true },
		orderBy: { createdAt: "desc" },
		columns: vodCatalogColumns,
		with: {
			questions: {
				columns: {},
				with: {
					skill: {
						columns: vodCatalogSkillColumns,
					},
				},
			},
		},
	});

	const catalog: VodCatalogItem[] = rows.map((row) => {
		const uniqueSkills = new Map<
			string,
			NonNullable<(typeof row.questions)[number]["skill"]>
		>();
		for (const { skill } of row.questions) {
			if (skill) {
				uniqueSkills.set(skill.id, skill);
			}
		}

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
