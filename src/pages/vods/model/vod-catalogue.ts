import type { CompetitiveTier, SkillCategory } from "@/shared/db";
import type { Role } from "@/shared/vod";

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

export type { VodCatalogueItem };
