import { and, asc, count, desc, eq, inArray, sql, type SQL } from "drizzle-orm";

import { checkpoints, skillCategories, vods, type SkillCategory } from "@/shared/db";
import { getDb, type DbContext } from "@/shared/db/index.server";
import { getHeroRole, getHeroesForRole } from "@/shared/vod";

import {
  DEFAULT_VOD_SORT,
  normalizeVodFilters,
  type VodCatalogueFilters,
  type VodCatalogueItem,
  type VodSortOption,
} from "../model/vod-catalogue";

async function getVods(
  filters: VodCatalogueFilters = {},
  { db = getDb() }: DbContext = {},
): Promise<VodCatalogueItem[]> {
  const normalized = normalizeVodFilters(filters);
  const conditions = buildVodFilterConditions(normalized);
  const sort = normalized.sort ?? DEFAULT_VOD_SORT;

  const vodRows = await db
    .select({
      checkpointCount: count(checkpoints.id),
      curatedOrder: vods.curatedOrder,
      hero: vods.hero,
      id: vods.id,
      map: vods.map,
      tier: vods.tier,
      title: vods.title,
      youtubeVideoId: vods.youtubeVideoId,
    })
    .from(vods)
    .leftJoin(checkpoints, eq(checkpoints.vodId, vods.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .groupBy(vods.id)
    .orderBy(...getVodOrderBy(sort));

  if (vodRows.length === 0) {
    return [];
  }

  const categoryRows = await db
    .selectDistinct({ skillCategory: checkpoints.skillCategory, vodId: checkpoints.vodId })
    .from(checkpoints)
    .where(
      inArray(
        checkpoints.vodId,
        vodRows.map((vod) => vod.id),
      ),
    );

  const categoryMap = groupSkillCategories(categoryRows);

  return vodRows.map((vod) => {
    const categories = categoryMap.get(vod.id);
    return {
      checkpointCount: vod.checkpointCount,
      curatedOrder: vod.curatedOrder,
      hero: vod.hero,
      id: vod.id,
      map: vod.map,
      role: getHeroRole(vod.hero),
      skillCategories: categories
        ? skillCategories.filter((category) => categories.has(category))
        : [],
      tier: vod.tier,
      title: vod.title,
      youtubeVideoId: vod.youtubeVideoId,
    };
  });
}

async function getVodMaps({ db = getDb() }: DbContext = {}): Promise<string[]> {
  const rows = await db.selectDistinct({ map: vods.map }).from(vods).orderBy(asc(vods.map));
  return rows.map((row) => row.map);
}

function buildVodFilterConditions(filters: VodCatalogueFilters): SQL[] {
  const conditions: SQL[] = [];

  if (filters.q !== undefined) {
    const pattern = `%${escapeLikePattern(filters.q.toLowerCase())}%`;
    conditions.push(
      sql`(lower(${vods.title}) LIKE ${pattern} ESCAPE '!' OR lower(${vods.hero}) LIKE ${pattern} ESCAPE '!' OR lower(${vods.map}) LIKE ${pattern} ESCAPE '!')`,
    );
  }
  if (filters.role !== undefined) {
    conditions.push(inArray(vods.hero, getHeroesForRole(filters.role)));
  }
  if (filters.tier !== undefined) {
    conditions.push(eq(vods.tier, filters.tier));
  }
  if (filters.map !== undefined) {
    conditions.push(eq(vods.map, filters.map));
  }

  return conditions;
}

function getVodOrderBy(sort: VodSortOption): SQL[] {
  switch (sort) {
    case "Curated": {
      return [asc(vods.curatedOrder), asc(vods.title)];
    }
    case "Map A–Z": {
      return [asc(vods.map), asc(vods.curatedOrder), asc(vods.title)];
    }
    case "Hero A–Z": {
      return [asc(vods.hero), asc(vods.curatedOrder), asc(vods.title)];
    }
    case "Most Checkpoints": {
      return [desc(count(checkpoints.id)), asc(vods.curatedOrder), asc(vods.title)];
    }
  }
}

function escapeLikePattern(value: string): string {
  return value.replaceAll("!", "!!").replaceAll("%", "!%").replaceAll("_", "!_");
}

function groupSkillCategories(
  rows: readonly { skillCategory: SkillCategory; vodId: string }[],
): Map<string, Set<SkillCategory>> {
  const categoryMap = new Map<string, Set<SkillCategory>>();

  for (const row of rows) {
    const categories = categoryMap.get(row.vodId) ?? new Set<SkillCategory>();
    categories.add(row.skillCategory);
    categoryMap.set(row.vodId, categories);
  }

  return categoryMap;
}

export { getVodMaps, getVods };
