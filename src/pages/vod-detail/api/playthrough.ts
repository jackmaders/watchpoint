import type {
	CreatePlaythroughInput,
	JsonValue,
	ModuleType,
} from "@/shared/db";
import { completePlaythrough, createPlaythrough } from "@/shared/db";
import { getCurrentUser } from "@/shared/lib/auth";

export type StartPlaythroughInput = Omit<CreatePlaythroughInput, "userId">;

export type StartPlaythroughResult =
	| {
			playthrough: Awaited<ReturnType<typeof createPlaythrough>>;
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
		return {
			playthrough: await createPlaythrough(
				{ ...input, userId: user.id },
				context,
			),
			scenarioSnapshotIds: input.scenarios.map(
				(scenario) => scenario.id ?? scenario.scenarioId,
			),
			success: true,
		};
	} catch (error) {
		return {
			error:
				error instanceof Error && error.message === "Playthrough start conflict"
					? "Playthrough start conflict"
					: "We couldn’t save your progress. Your training session can continue.",
			success: false,
		};
	}
}

export type CompletePlaythroughResult =
	| {
			completion: Awaited<ReturnType<typeof completePlaythrough>>;
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
		const completion = await completePlaythrough(
			playthroughId,
			user.id,
			context,
		);
		return completion
			? { completion, success: true }
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
