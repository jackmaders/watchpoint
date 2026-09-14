/**
 * Type definitions and domain contracts for the history detail page slice.
 *
 * Exposes detailed player history item structures, scenario snapshot summaries,
 * and rule outcome types for individual training playthrough reviews.
 */

import type { PlayerHistoryItem, PlaythroughStatus } from "@/shared/db";

export type { PlayerHistoryItem, PlaythroughStatus };

export interface GetHistoryDetailInput {
	id: string;
	userId?: string;
}

export type GetHistoryDetailResult =
	| { data: PlayerHistoryItem | null; status: "success" }
	| { reason: string; status: "rejected" };
