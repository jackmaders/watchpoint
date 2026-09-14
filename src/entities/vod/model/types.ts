/**
 * Type definitions and entity contracts for VOD catalog items, interactive scenarios, and session manifests.
 */

import type {
	HeroRole,
	InputType,
	ModuleType,
	scenarios,
	vods,
} from "@/shared/db";

export type { HeroRole, InputType, ModuleType };

export type VodItem = typeof vods.$inferSelect;
export type ScenarioItem = typeof scenarios.$inferSelect;

export type PublishedVodItem = VodItem & {
	scenarios: Array<{ id: string }>;
};

export type SessionManifest = VodItem & {
	scenarios: ScenarioItem[];
};
