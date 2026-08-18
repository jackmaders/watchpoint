import { and, desc, eq } from "drizzle-orm";
import { type DbContext, getDb } from "../client/client";
import {
	type JsonValue,
	type ModuleType,
	type PlaythroughStatus,
	playthroughModuleSelections,
	playthroughs,
	scenarioSnapshots,
} from "../schema";

export interface ScenarioSnapshotInput {
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
}

export interface CreatePlaythroughInput {
	id?: string;
	modules: readonly ModuleType[];
	scenarios: readonly ScenarioSnapshotInput[];
	userId: string;
	vodId: string;
}

export async function createPlaythrough(
	input: CreatePlaythroughInput,
	context?: DbContext,
) {
	const db = await getDb(context);

	return db.transaction(async (tx) => {
		const [playthrough] = await tx
			.insert(playthroughs)
			.values({
				...(input.id ? { id: input.id } : {}),
				userId: input.userId,
				vodId: input.vodId,
			})
			.returning();

		if (!playthrough) {
			throw new Error("Failed to create playthrough");
		}

		if (input.modules.length > 0) {
			await tx.insert(playthroughModuleSelections).values(
				input.modules.map((moduleType) => ({
					moduleType,
					playthroughId: playthrough.id,
				})),
			);
		}

		if (input.scenarios.length > 0) {
			await tx.insert(scenarioSnapshots).values(
				input.scenarios.map((scenario, position) => ({
					...scenario,
					playthroughId: playthrough.id,
					position,
				})),
			);
		}

		return playthrough;
	});
}

export async function getPlaythrough(
	id: string,
	userId?: string,
	context?: DbContext,
) {
	const db = await getDb(context);

	return db.query.playthroughs.findFirst({
		where: userId
			? (playthrough, { and, eq }) =>
					and(eq(playthrough.id, id), eq(playthrough.userId, userId))
			: (playthrough, { eq }) => eq(playthrough.id, id),
		with: {
			attempts: true,
			moduleSelections: true,
			scenarioSnapshots: {
				orderBy: (snapshots, { asc }) => [asc(snapshots.position)],
			},
		},
	});
}

export async function getPlayerHistory(userId: string, context?: DbContext) {
	const db = await getDb(context);
	const playthroughsForUser = await db.query.playthroughs.findMany({
		orderBy: [desc(playthroughs.createdAt)],
		where: (playthrough, { eq }) => eq(playthrough.userId, userId),
		with: {
			user: {
				columns: { isTestAccount: true },
			},
		},
	});

	return playthroughsForUser.filter(
		(playthrough) => !playthrough.user.isTestAccount,
	);
}

export async function completePlaythrough(
	id: string,
	userId: string,
	context?: DbContext,
) {
	const db = await getDb(context);
	const [completed] = await db
		.update(playthroughs)
		.set({
			completedAt: new Date(),
			status: "COMPLETED" satisfies PlaythroughStatus,
		})
		.where(and(eq(playthroughs.id, id), eq(playthroughs.userId, userId)))
		.returning();

	return completed ?? null;
}
