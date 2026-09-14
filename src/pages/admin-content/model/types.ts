/**
 * Type definitions and contracts for the admin content catalog slice.
 */

import type { HeroRole, vods } from "@/shared/db";

export type { HeroRole };

export type AdminVodItem = typeof vods.$inferSelect & {
	scenarios: Array<{ id: string }>;
};
