import { desc } from "drizzle-orm";
import { getDb } from "../client/client";
import { type ModuleType, vods } from "../schema";

export interface GetVodByIdOptions {
	publishedOnly?: boolean;
}

export type PublishedVodItem = Awaited<
	ReturnType<typeof getPublishedVods>
>[number];

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

export interface GetVodManifestOptions {
	modules?: string[];
	publishedOnly?: boolean;
}

export async function getVodManifest(
	id: string,
	options: GetVodManifestOptions = {},
) {
	const db = await getDb();
	const { modules, publishedOnly = true } = options;

	const vod = await db.query.vods.findFirst({
		where: publishedOnly
			? (vods, { and, eq }) => and(eq(vods.id, id), eq(vods.isPublished, true))
			: (vods, { eq }) => eq(vods.id, id),
		with: {
			scenarios: {
				orderBy: (scenarios, { asc }) => [asc(scenarios.timestampSeconds)],
				where:
					modules && modules.length > 0
						? (scenarios, { inArray }) =>
								inArray(scenarios.moduleType, modules as ModuleType[])
						: undefined,
			},
		},
	});

	if (!vod) {
		return null;
	}

	return vod;
}
