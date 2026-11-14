import type { CompetitiveTier, SkillCategory } from "@/shared/db";
import type { Role } from "@/shared/vod";

interface VodCheckpoint {
  correctOptionIndex: number;
  explanation: string;
  id: string;
  options: string[];
  question: string;
  skillCategory: SkillCategory;
  timeSec: number;
  vodId: string;
}

interface VodDetail {
  checkpoints: VodCheckpoint[];
  hero: string;
  id: string;
  map: string;
  role: Role;
  tier: CompetitiveTier;
  title: string;
  youtubeVideoId: string;
}

export type { VodCheckpoint, VodDetail };
