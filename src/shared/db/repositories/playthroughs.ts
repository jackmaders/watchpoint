import { and, desc, eq } from "drizzle-orm";
import { type DbContext, getDb } from "../client/client";
import {
	auditEntries,
	type JsonValue,
	type ModuleType,
	type PlaythroughStatus,
	playthroughCompletions,
	playthroughModuleSelections,
	playthroughs,
	scenarioSnapshots,
} from "../schema";

export const PLAYTHROUGH_START_CONFLICT_ERROR = "Playthrough start conflict";
export const PLAYTHROUGH_NOT_IN_PROGRESS_ERROR =
	"Playthrough is not in progress";

export interface ScenarioSnapshotInput {
	id?: string;
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

function sameJson(left: unknown, right: unknown): boolean {
	return JSON.stringify(left) === JSON.stringify(right);
}

function matchesStartRequest(
	playthrough: NonNullable<Awaited<ReturnType<typeof getPlaythrough>>>,
	input: CreatePlaythroughInput,
): boolean {
	return (
		playthrough.userId === input.userId &&
		playthrough.vodId === input.vodId &&
		playthrough.moduleSelections.map((item) => item.moduleType).join(",") ===
			input.modules.join(",") &&
		playthrough.scenarioSnapshots.length === input.scenarios.length &&
		playthrough.scenarioSnapshots.every((snapshot, position) => {
			const scenario = input.scenarios[position];
			return (
				scenario !== undefined &&
				snapshot.position === position &&
				snapshot.scenarioId === scenario.scenarioId &&
				snapshot.moduleType === scenario.moduleType &&
				snapshot.promptText === scenario.promptText &&
				snapshot.explanationText === scenario.explanationText &&
				snapshot.imageUrl === (scenario.imageUrl ?? null) &&
				snapshot.inputType === scenario.inputType &&
				sameJson(snapshot.inputConfig, scenario.inputConfig) &&
				snapshot.timestampSeconds === scenario.timestampSeconds &&
				snapshot.timeLimitSeconds === (scenario.timeLimitSeconds ?? null)
			);
		})
	);
}

export async function createPlaythrough(
	input: CreatePlaythroughInput,
	context?: DbContext,
) {
	const db = await getDb(context);

	try {
		return await db.transaction(async (tx) => {
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
						...(scenario.id ? { id: scenario.id } : {}),
						...scenario,
						playthroughId: playthrough.id,
						position,
					})),
				);
			}
			await tx.insert(auditEntries).values({
				action: "PLAYTHROUGH_CREATED",
				actorUserId: input.userId,
				entityId: playthrough.id,
				entityType: "PLAYTHROUGH",
				metadata: {
					moduleCount: input.modules.length,
					scenarioCount: input.scenarios.length,
					vodId: input.vodId,
				},
			});

			return playthrough;
		});
	} catch (error) {
		if (
			!input.id ||
			!(error instanceof Error) ||
			!/unique constraint failed/i.test(error.message)
		) {
			throw error;
		}
		const existing = await getPlaythrough(input.id, input.userId, context);
		if (existing && matchesStartRequest(existing, input)) return existing;
		throw new Error(PLAYTHROUGH_START_CONFLICT_ERROR);
	}
}

export async function getPlaythrough(
	id: string,
	userId: string,
	context?: DbContext,
) {
	const db = await getDb(context);

	return db.query.playthroughs.findFirst({
		where: (playthrough, { and, eq }) =>
			and(eq(playthrough.id, id), eq(playthrough.userId, userId)),
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
		orderBy: [desc(playthroughs.createdAt), desc(playthroughs.id)],
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
	const completedAt = new Date();
	try {
		const completion = await db.transaction(async (tx) => {
			const [playthrough] = await tx
				.update(playthroughs)
				.set({
					completedAt,
					status: "COMPLETED" satisfies PlaythroughStatus,
				})
				.where(
					and(
						eq(playthroughs.id, id),
						eq(playthroughs.userId, userId),
						eq(playthroughs.status, "IN_PROGRESS"),
					),
				)
				.returning();
			if (!playthrough) return null;
			const [completion] = await tx
				.insert(playthroughCompletions)
				.values({ completedAt, playthroughId: id, userId })
				.returning();
			await tx.insert(auditEntries).values({
				action: "PLAYTHROUGH_COMPLETED",
				actorUserId: userId,
				entityId: id,
				entityType: "PLAYTHROUGH",
				metadata: { completionId: completion?.id ?? null },
			});
			return completion ?? null;
		});
		if (completion) return completion;
		return (
			(await db.query.playthroughCompletions.findFirst({
				where: (existing, { and, eq }) =>
					and(eq(existing.playthroughId, id), eq(existing.userId, userId)),
			})) ?? null
		);
	} catch (error) {
		if (
			!(error instanceof Error) ||
			!/unique constraint failed/i.test(error.message)
		) {
			throw error;
		}
		return db.query.playthroughCompletions.findFirst({
			where: (completion, { and, eq }) =>
				and(eq(completion.playthroughId, id), eq(completion.userId, userId)),
		});
	}
}
