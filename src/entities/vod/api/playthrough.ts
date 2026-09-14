/**
 * Domain actions for initializing and finalizing interactive VOD training playthrough sessions.
 *
 * Implements `startPlaythroughAction` and `completePlaythroughAction` with user authentication checks
 * and graceful fallback semantics using direct query functions.
 */
import {
	createDbClient,
	createPlaythrough,
	createPlaythroughCompletion,
	createPlaythroughModuleSelections,
	createScenarioSnapshots,
	getPlaythroughById,
	type JsonValue,
	type ModuleType,
	type playthroughCompletions,
	type playthroughs,
	updatePlaythrough,
} from "@/shared/db";
import { getCurrentUser } from "@/shared/lib/auth";

export type PlaythroughItem = typeof playthroughs.$inferSelect;
export type PlaythroughCompletionItem =
	typeof playthroughCompletions.$inferSelect;

export type PlaythroughScenarioInput = {
	explanationText: string;
	id?: string;
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

export interface StartPlaythroughInput {
	id?: string;
	modules: ModuleType[];
	scenarios: PlaythroughScenarioInput[];
	vodId: string;
}

export type StartPlaythroughResult =
	| {
			playthrough: PlaythroughItem;
			scenarioSnapshotIds: string[];
			success: true;
	  }
	| { error: string; success: false };

function handlePlaythroughStartError(error: unknown): StartPlaythroughResult {
	const message = error instanceof Error ? error.message : "";
	if (
		message.includes("conflict") ||
		message.includes("Playthrough start conflict")
	) {
		return {
			error: "Playthrough start conflict",
			success: false,
		};
	}
	return {
		error:
			"We couldn’t save your progress. Your training session can continue.",
		success: false,
	};
}

export async function startPlaythroughAction(
	input: StartPlaythroughInput,
	db = createDbClient(),
): Promise<StartPlaythroughResult> {
	const user = await getCurrentUser();
	if (!user) return { error: "Authentication required", success: false };
	try {
		const created = await createPlaythrough(
			{
				...(input.id ? { id: input.id } : {}),
				userId: user.id,
				vodId: input.vodId,
			},
			db,
		);

		if (!created) {
			return {
				error:
					"We couldn’t save your progress. Your training session can continue.",
				success: false,
			};
		}

		if (input.modules.length > 0) {
			await createPlaythroughModuleSelections(
				input.modules.map((moduleType) => ({
					moduleType,
					playthroughId: created.id,
				})),
				db,
			);
		}

		if (input.scenarios.length > 0) {
			await createScenarioSnapshots(
				input.scenarios.map((scenario, position) => ({
					...(scenario.id ? { id: scenario.id } : {}),
					explanationText: scenario.explanationText,
					imageUrl: scenario.imageUrl ?? null,
					inputConfig: scenario.inputConfig,
					inputType: scenario.inputType,
					moduleType: scenario.moduleType,
					playthroughId: created.id,
					position,
					promptText: scenario.promptText,
					scenarioId: scenario.scenarioId,
					timeLimitSeconds: scenario.timeLimitSeconds ?? null,
					timestampSeconds: scenario.timestampSeconds,
				})),
				db,
			);
		}

		return {
			playthrough: created,
			scenarioSnapshotIds: input.scenarios.map(
				(scenario) => scenario.id ?? scenario.scenarioId,
			),
			success: true,
		};
	} catch (error) {
		return handlePlaythroughStartError(error);
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
	db = createDbClient(),
): Promise<CompletePlaythroughResult> {
	const user = await getCurrentUser();
	if (!user) return { error: "Authentication required", success: false };
	try {
		const existing = await getPlaythroughById(playthroughId, db);
		if (!existing || existing.userId !== user.id) {
			return { error: "Playthrough not found", success: false };
		}

		const completedAt = new Date();
		await updatePlaythrough(
			playthroughId,
			{
				completedAt,
				status: "COMPLETED",
			},
			db,
		);

		const completion = await createPlaythroughCompletion(
			{
				completedAt,
				playthroughId,
				userId: user.id,
			},
			db,
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
