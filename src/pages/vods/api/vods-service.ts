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
  const sort = normalized.sort ?? DEFAULT_VOD_SORT;
  const vodRows = await queryVodRows(db, normalized, sort);

  if (vodRows.length === 0) {
    return [];
  }

  const categoryMap = await queryVodCategoryMap(
    db,
    vodRows.map((vod) => vod.id),
  );

  return vodRows.map((vod) => mapVodRowToItem(vod, categoryMap.get(vod.id)));
}

async function getVodMaps({ db = getDb() }: DbContext = {}): Promise<string[]> {
  const rows = await db.selectDistinct({ map: vods.map }).from(vods).orderBy(asc(vods.map));
  return rows.map((row) => row.map);
}

async function queryVodRows(
  db: ReturnType<typeof getDb>,
  filters: VodCatalogueFilters,
  sort: VodSortOption,
) {
  const conditions = buildVodFilterConditions(filters);

  return await db
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
}

async function queryVodCategoryMap(db: ReturnType<typeof getDb>, vodIds: readonly string[]) {
  const categoryRows = await db
    .selectDistinct({ skillCategory: checkpoints.skillCategory, vodId: checkpoints.vodId })
    .from(checkpoints)
    .where(inArray(checkpoints.vodId, vodIds));

  return groupSkillCategories(categoryRows);
}

interface VodRow {
  checkpointCount: number;
  curatedOrder: number;
  hero: string;
  id: string;
  map: string;
  tier: VodCatalogueItem["tier"];
  title: string;
  youtubeVideoId: string;
}

function mapVodRowToItem(
  vod: VodRow,
  categories: Set<SkillCategory> | undefined,
): VodCatalogueItem {
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
}

function buildSearchCondition(query: string): SQL {
  const pattern = `%${escapeLikePattern(query.toLowerCase())}%`;
  return sql`(lower(${vods.title}) LIKE ${pattern} ESCAPE '!' OR lower(${vods.hero}) LIKE ${pattern} ESCAPE '!' OR lower(${vods.map}) LIKE ${pattern} ESCAPE '!')`;
}

function buildVodFilterConditions(filters: VodCatalogueFilters): SQL[] {
  const candidates: (SQL | undefined)[] = [
    filters.q === undefined ? undefined : buildSearchCondition(filters.q),
    filters.role === undefined ? undefined : inArray(vods.hero, getHeroesForRole(filters.role)),
    filters.tier === undefined ? undefined : eq(vods.tier, filters.tier),
    filters.map === undefined ? undefined : eq(vods.map, filters.map),
  ];

  return candidates.filter((condition): condition is SQL => condition !== undefined);
}

function getVodOrderBy(sort: VodSortOption): SQL[] {
  const orderByBySort: Record<VodSortOption, SQL[]> = {
    Curated: [asc(vods.curatedOrder), asc(vods.title)],
    "Hero A–Z": [asc(vods.hero), asc(vods.curatedOrder), asc(vods.title)],
    "Map A–Z": [asc(vods.map), asc(vods.curatedOrder), asc(vods.title)],
    "Most Checkpoints": [desc(count(checkpoints.id)), asc(vods.curatedOrder), asc(vods.title)],
  };

  return orderByBySort[sort];
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
