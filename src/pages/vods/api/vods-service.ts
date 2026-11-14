import { asc, inArray } from "drizzle-orm";

import { checkpoints, skillCategories, vods, type SkillCategory } from "@/shared/db";
import { getDb, type DbContext } from "@/shared/db/index.server";
import { getHeroRole } from "@/shared/vod";

import type { VodCatalogueItem } from "../model/vod-catalogue";

interface CheckpointSummary {
  categories: Set<SkillCategory>;
  count: number;
}

async function getVods({ db = getDb() }: DbContext = {}): Promise<VodCatalogueItem[]> {
  const vodRows = await db.select().from(vods).orderBy(asc(vods.curatedOrder), asc(vods.title));

  if (vodRows.length === 0) {
    return [];
  }

  const checkpointRows = await db
    .select({ skillCategory: checkpoints.skillCategory, vodId: checkpoints.vodId })
    .from(checkpoints)
    .where(
      inArray(
        checkpoints.vodId,
        vodRows.map((vod) => vod.id),
      ),
    );

  const summaryMap = summarizeCheckpoints(checkpointRows);

  return vodRows.map((vod) => {
    const summary = summaryMap.get(vod.id);
    return {
      checkpointCount: summary?.count ?? 0,
      curatedOrder: vod.curatedOrder,
      hero: vod.hero,
      id: vod.id,
      map: vod.map,
      role: getHeroRole(vod.hero),
      skillCategories: summary
        ? skillCategories.filter((category) => summary.categories.has(category))
        : [],
      tier: vod.tier,
      title: vod.title,
      youtubeVideoId: vod.youtubeVideoId,
    };
  });
}

function summarizeCheckpoints(
  rows: readonly { skillCategory: SkillCategory; vodId: string }[],
): Map<string, CheckpointSummary> {
  const summaryMap = new Map<string, CheckpointSummary>();

  for (const row of rows) {
    const current = summaryMap.get(row.vodId) ?? {
      categories: new Set<SkillCategory>(),
      count: 0,
    };
    current.count += 1;
    current.categories.add(row.skillCategory);
    summaryMap.set(row.vodId, current);
  }

  return summaryMap;
}

export { getVods };
