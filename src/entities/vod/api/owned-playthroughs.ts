/**
 * User-scoped database operations for creating, retrieving, and completing interactive training playthroughs.
 *
 * Implements user ownership boundary checks around domain operations. Resolves
 * the authenticated user context before delegating CRUD, history listing, and playthrough finalization
 * to the underlying D1 database layer via direct query functions.
 */
import {
	createDbClient,
	getPlaythroughById,
	queryAttemptRecords,
	queryPlaythroughs,
} from "@/shared/db";
import { getCurrentUser } from "@/shared/lib/auth";
import {
	completePlaythroughAction,
	type StartPlaythroughInput,
	startPlaythroughAction,
} from "./playthrough";

const AUTHENTICATION_REQUIRED = "Authentication required";

async function requireCurrentUser(): Promise<{ id: string }> {
	const user = await getCurrentUser();
	if (!user) throw new Error(AUTHENTICATION_REQUIRED);
	return user;
}

export async function createOwnedPlaythrough(
	input: StartPlaythroughInput,
	db = createDbClient(),
) {
	await requireCurrentUser();
	return startPlaythroughAction({ ...input }, db);
}

export async function getOwnedPlaythrough(id: string, db = createDbClient()) {
	const user = await requireCurrentUser();
	const playthrough = await getPlaythroughById(id, db);
	if (!playthrough || playthrough.userId !== user.id) {
		return null;
	}
	return playthrough;
}

export async function getOwnedPlayerHistory(db = createDbClient()) {
	const user = await requireCurrentUser();
	return queryPlaythroughs({ filter: { userId: { eq: user.id } } }, db);
}

export async function getOwnedPlaythroughAttempts(
	playthroughId: string,
	db = createDbClient(),
) {
	const user = await requireCurrentUser();
	const playthrough = await getPlaythroughById(playthroughId, db);
	if (!playthrough || playthrough.userId !== user.id) {
		return [];
	}
	return queryAttemptRecords(
		{
			filter: {
				playthroughId: { eq: playthroughId },
				userId: { eq: user.id },
			},
			order: { createdAt: "asc" },
		},
		db,
	);
}

export async function completeOwnedPlaythrough(
	playthroughId: string,
	db = createDbClient(),
) {
	await requireCurrentUser();
	return completePlaythroughAction(playthroughId, db);
}
