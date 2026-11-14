import { asc, inArray } from "drizzle-orm";

import {
  checkpoints,
  skillCategories,
  vods,
  type CompetitiveTier,
  type SkillCategory,
} from "@/shared/db";
import { getDb, type DbContext } from "@/shared/db/index.server";
import { getHeroRole, type Role } from "@/shared/vod";

interface VodCatalogueItem {
  checkpointCount: number;
  curatedOrder: number;
  hero: string;
  id: string;
  map: string;
  role: Role;
  skillCategories: SkillCategory[];
  tier: CompetitiveTier;
  title: string;
  youtubeVideoId: string;
}

interface CheckpointSummary {
  categories: Set<SkillCategory>;
  count: number;
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

export { getVods, type VodCatalogueItem };
