import type { DbContext } from "@/shared/db";
import { type CreatePlaythroughInput, playthroughService } from "@/shared/db";
import { getCurrentUser } from "@/shared/lib/auth";

const AUTHENTICATION_REQUIRED = "Authentication required";

async function requireCurrentUser(
	context?: DbContext,
): Promise<{ id: string }> {
	const user = await getCurrentUser(undefined, context);
	if (!user) throw new Error(AUTHENTICATION_REQUIRED);
	return user;
}

type CreateOwnedPlaythroughInput = Omit<CreatePlaythroughInput, "userId">;

export async function createOwnedPlaythrough(
	input: CreateOwnedPlaythroughInput,
	context?: DbContext,
) {
	const user = await requireCurrentUser(context);
	return playthroughService.create({ ...input, userId: user.id }, context);
}

export async function getOwnedPlaythrough(id: string, context?: DbContext) {
	const user = await requireCurrentUser(context);
	return playthroughService.getById({ id, userId: user.id }, context);
}

export async function getOwnedPlayerHistory(context?: DbContext) {
	const user = await requireCurrentUser(context);
	return playthroughService.listHistory({ userId: user.id }, context);
}

export async function getOwnedPlaythroughAttempts(
	playthroughId: string,
	context?: DbContext,
) {
	const user = await requireCurrentUser(context);
	return playthroughService.getAttempts(
		{ playthroughId, userId: user.id },
		context,
	);
}

export async function completeOwnedPlaythrough(
	playthroughId: string,
	context?: DbContext,
) {
	const user = await requireCurrentUser(context);
	return playthroughService.complete(
		{ id: playthroughId, userId: user.id },
		context,
	);
}
