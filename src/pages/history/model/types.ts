/**
 * Type definitions and domain contracts for the training match history page slice.
 *
 * Exposes playthrough history payloads, pagination structures, module filters,
 * and rule outcome types for match history presentation.
 */

import type {
	JsonValue,
	ModuleType,
	PlaythroughStatus,
	vods,
} from "@/shared/db";

export type { JsonValue, ModuleType, PlaythroughStatus };
export type PublishedVodItem = typeof vods.$inferSelect;

export interface GetPlayerHistoryOptions {
	limit?: number;
	modules?: readonly ModuleType[];
	offset?: number;
	page?: number;
	pageSize?: number;
	status?: PlaythroughStatus;
	vodId?: string;
}

export interface PlayerHistoryItem {
	accuracy: number;
	attempts: {
		id: string;
		inputValue: Record<string, JsonValue> | null;
		isCorrect: boolean;
		isTimedOut: boolean;
		responseTimeMs: number;
		scenarioSnapshotId: string | null;
		selectedOptionId: string | null;
	}[];
	completedAt: Date | null;
	completion: {
		completedAt: Date;
		id: string;
	} | null;
	createdAt: Date;
	id: string;
	medianLatencyMs: number | null;
	moduleSelections: { moduleType: ModuleType }[];
	scenarioSnapshots: {
		explanationText: string;
		id: string;
		imageUrl: string | null;
		inputConfig: Record<string, JsonValue>;
		inputType:
			| "MULTIPLE_CHOICE"
			| "PERCENT_SLIDER"
			| "TIME_SLIDER"
			| "MAP_PIN_2D";
		moduleType: ModuleType;
		position: number;
		promptText: string;
		scenarioId: string;
		timeLimitSeconds: number | null;
		timestampSeconds: number;
	}[];
	status: PlaythroughStatus;
	userId: string;
	vod?: {
		durationSeconds: number;
		id: string;
		mapName: string;
		rankTier: string;
		title: string;
		youtubeVideoId: string;
	} | null;
	vodId: string;
}

export interface PlayerHistoryResult {
	items: PlayerHistoryItem[];
	page: number;
	pageSize: number;
	total: number;
	totalPages: number;
}

export interface GetHistoryInput extends GetPlayerHistoryOptions {
	userId?: string;
}

export type GetHistoryResult =
	| { data: PlayerHistoryResult; status: "success" }
	| { reason: string; status: "rejected" };
