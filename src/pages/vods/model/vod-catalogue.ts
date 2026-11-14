import { z } from "zod";

import { competitiveTiers, type CompetitiveTier, type SkillCategory } from "@/shared/db";
import { ROLES, type Role } from "@/shared/vod";

const VOD_SORT_OPTIONS = ["Curated", "Map A–Z", "Hero A–Z", "Most Checkpoints"] as const;

type VodSortOption = (typeof VOD_SORT_OPTIONS)[number];

const DEFAULT_VOD_SORT: VodSortOption = "Curated";

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

interface VodCatalogueFilters {
  map?: string | undefined;
  // oxlint-disable-next-line eslint/id-length -- URL search parameter "q" is required by Ticket #12.
  q?: string | undefined;
  role?: Role | undefined;
  sort?: VodSortOption | undefined;
  tier?: CompetitiveTier | undefined;
}

const optionalTrimmedTextSchema = z
  .string()
  .transform((value) => {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  })
  .optional();

const vodCatalogueQuerySchema = z.object({
  map: optionalTrimmedTextSchema,
  // oxlint-disable-next-line eslint/id-length -- URL search parameter "q" is required by Ticket #12.
  q: optionalTrimmedTextSchema,
  role: z.enum(ROLES).optional(),
  sort: z.enum(VOD_SORT_OPTIONS).optional(),
  tier: z.enum(competitiveTiers).optional(),
});

function normalizeVodFilters(filters: VodCatalogueFilters = {}): VodCatalogueFilters {
  const trimmedQuery = filters.q?.trim();
  const trimmedMap = filters.map?.trim();

  return omitUndefinedFilters({
    map: trimmedMap !== undefined && trimmedMap.length > 0 ? trimmedMap : undefined,
    // oxlint-disable-next-line eslint/id-length -- URL search parameter "q" is required by Ticket #12.
    q: trimmedQuery !== undefined && trimmedQuery.length > 0 ? trimmedQuery : undefined,
    role: filters.role,
    sort: filters.sort === DEFAULT_VOD_SORT ? undefined : filters.sort,
    tier: filters.tier,
  });
}

const vodsQueryInputSchema = vodCatalogueQuerySchema.transform(normalizeVodFilters).optional();

function parseVodCatalogueSearch(search: Record<string, unknown>): VodCatalogueFilters {
  return normalizeVodFilters({
    map: parseOptionalField(optionalTrimmedTextSchema, search["map"]),
    // oxlint-disable-next-line eslint/id-length -- URL search parameter "q" is required by Ticket #12.
    q: parseOptionalField(optionalTrimmedTextSchema, search["q"]),
    role: parseOptionalField(z.enum(ROLES), search["role"]),
    sort: parseOptionalField(z.enum(VOD_SORT_OPTIONS), search["sort"]),
    tier: parseOptionalField(z.enum(competitiveTiers), search["tier"]),
  });
}

function parseOptionalField<TSchema extends z.ZodType>(
  schema: TSchema,
  value: unknown,
): z.output<TSchema> | undefined {
  const parsed = schema.safeParse(value);
  return parsed.success ? parsed.data : undefined;
}

function omitUndefinedFilters(filters: VodCatalogueFilters): VodCatalogueFilters {
  return Object.fromEntries(Object.entries(filters).filter(([, value]) => value !== undefined));
}

export {
  DEFAULT_VOD_SORT,
  VOD_SORT_OPTIONS,
  normalizeVodFilters,
  parseVodCatalogueSearch,
  vodsQueryInputSchema,
  type VodCatalogueFilters,
  type VodCatalogueItem,
  type VodSortOption,
};
