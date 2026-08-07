import { desc } from "drizzle-orm";
import { getDb } from "../client/client";
import { vods } from "../schema";

export interface GetVodByIdOptions {
	publishedOnly?: boolean;
}

export async function getPublishedVods() {
	const db = await getDb();

	return db.query.vods.findMany({
		orderBy: [desc(vods.createdAt)],
		where: (vods, { eq }) => eq(vods.isPublished, true),
		with: {
			scenarios: {
				columns: {
					id: true,
				},
			},
		},
	});
}

export async function getVodById(
	id: string,
	options: GetVodByIdOptions = { publishedOnly: true },
) {
	const db = await getDb();
	const { publishedOnly = true } = options;

	return db.query.vods.findFirst({
		where: publishedOnly
			? (vods, { and, eq }) => and(eq(vods.id, id), eq(vods.isPublished, true))
			: (vods, { eq }) => eq(vods.id, id),
		with: {
			scenarios: {
				orderBy: (scenarios, { asc }) => [asc(scenarios.timestampSeconds)],
			},
		},
	});
}
