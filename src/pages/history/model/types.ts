/**
 * Type definitions and domain contracts for the training match history page slice.
 *
 * Exposes playthrough history payloads, pagination structures, module filters,
 * and rule outcome types for match history presentation.
 */

import type {
	GetPlayerHistoryOptions,
	ModuleType,
	PlayerHistoryItem,
	PlayerHistoryResult,
	PlaythroughStatus,
	PublishedVodItem,
} from "@/shared/db";

export type {
	GetPlayerHistoryOptions,
	ModuleType,
	PlayerHistoryItem,
	PlayerHistoryResult,
	PlaythroughStatus,
	PublishedVodItem,
};

export interface GetHistoryInput extends GetPlayerHistoryOptions {
	userId?: string;
}

export type GetHistoryResult =
	| { data: PlayerHistoryResult; status: "success" }
	| { reason: string; status: "rejected" };
