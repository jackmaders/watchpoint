/**
 * Domain actions for initializing and finalizing interactive VOD training playthrough sessions.
 *
 * Implements `startPlaythroughAction` and `completePlaythroughAction` with user authentication checks
 * and graceful fallback semantics. Coordinates with `playthroughService` to create playthrough runs,
 * snapshot scenario states, and compute summary metrics including accuracy and median active-response latency.
 */
import type {
	CreatePlaythroughInput,
	JsonValue,
	ModuleType,
	PlaythroughCompletionItem,
	PlaythroughItem,
} from "@/shared/db";
import { playthroughService } from "@/shared/db";
import { getCurrentUser } from "@/shared/lib/auth";

export type StartPlaythroughInput = Omit<CreatePlaythroughInput, "userId">;

export type StartPlaythroughResult =
	| {
			playthrough: PlaythroughItem;
			scenarioSnapshotIds: string[];
			success: true;
	  }
	| { error: string; success: false };

export async function startPlaythroughAction(
	input: StartPlaythroughInput,
	context?: Parameters<typeof getCurrentUser>[1],
): Promise<StartPlaythroughResult> {
	const user = await getCurrentUser(undefined, context);
	if (!user) return { error: "Authentication required", success: false };
	try {
		const result = await playthroughService.create(
			{ ...input, userId: user.id },
			context,
		);
		if (!result.success) {
			return {
				error:
					result.error === "Playthrough start conflict"
						? "Playthrough start conflict"
						: "We couldn’t save your progress. Your training session can continue.",
				success: false,
			};
		}
		return {
			playthrough: result.data,
			scenarioSnapshotIds: input.scenarios.map(
				(scenario) => scenario.id ?? scenario.scenarioId,
			),
			success: true,
		};
	} catch {
		return {
			error:
				"We couldn’t save your progress. Your training session can continue.",
			success: false,
		};
	}
}

export type CompletePlaythroughResult =
	| {
			completion: PlaythroughCompletionItem;
			success: true;
	  }
	| { error: string; success: false };

export async function completePlaythroughAction(
	playthroughId: string,
	context?: Parameters<typeof getCurrentUser>[1],
): Promise<CompletePlaythroughResult> {
	const user = await getCurrentUser(undefined, context);
	if (!user) return { error: "Authentication required", success: false };
	try {
		const result = await playthroughService.complete(
			{ id: playthroughId, userId: user.id },
			context,
		);
		if (!result.success) {
			return {
				error:
					"We couldn’t save your progress. Your training session can continue.",
				success: false,
			};
		}
		return result.data
			? { completion: result.data, success: true }
			: { error: "Playthrough not found", success: false };
	} catch {
		return {
			error:
				"We couldn’t save your progress. Your training session can continue.",
			success: false,
		};
	}
}

export type PlaythroughScenarioInput = {
	explanationText: string;
	imageUrl?: string | null;
	inputConfig: Record<string, JsonValue>;
	inputType:
		| "MULTIPLE_CHOICE"
		| "PERCENT_SLIDER"
		| "TIME_SLIDER"
		| "MAP_PIN_2D";
	moduleType: ModuleType;
	promptText: string;
	scenarioId: string;
	timeLimitSeconds?: number | null;
	timestampSeconds: number;
};
