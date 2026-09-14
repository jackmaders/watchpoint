/**
 * Type definitions and domain contracts for the history detail page slice.
 *
 * Exposes detailed player history item structures, scenario snapshot summaries,
 * and rule outcome types for individual training playthrough reviews.
 */

import type { JsonValue, ModuleType, PlaythroughStatus } from "@/shared/db";

export type { JsonValue, ModuleType, PlaythroughStatus };

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

export interface GetHistoryDetailInput {
	id: string;
	userId?: string;
}

export type GetHistoryDetailResult =
	| { data: PlayerHistoryItem | null; status: "success" }
	| { reason: string; status: "rejected" };
