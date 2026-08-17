import { desc } from "drizzle-orm";
import { type DbContext, getDb } from "../client/client";
import { type ModuleType, vods } from "../schema";

export interface GetSessionManifestOptions {
	/** A null filter represents a nonblank filter with no valid module types. */
	modules?: readonly ModuleType[] | null;
	publishedOnly?: boolean;
}

export type PublishedVodItem = Awaited<
	ReturnType<typeof getPublishedVods>
>[number];

export type SessionManifest = NonNullable<
	Awaited<ReturnType<typeof getSessionManifest>>
>;

export async function getPublishedVods(context?: DbContext) {
	const db = await getDb(context);

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

export async function getSessionManifest(
	id: string,
	options: GetSessionManifestOptions = {},
	context?: DbContext,
) {
	const db = await getDb(context);
	const { modules, publishedOnly = true } = options;

	const vod = await db.query.vods.findFirst({
		where: publishedOnly
			? (vods, { and, eq }) => and(eq(vods.id, id), eq(vods.isPublished, true))
			: (vods, { eq }) => eq(vods.id, id),
		with: {
			scenarios: {
				orderBy: (scenarios, { asc }) => [asc(scenarios.timestampSeconds)],
				where:
					modules === null
						? (_scenarios, { sql }) => sql`1 = 0`
						: modules !== undefined
							? modules.length > 0
								? (scenarios, { inArray }) =>
										inArray(scenarios.moduleType, modules)
								: undefined
							: undefined,
			},
		},
	});

	if (!vod) {
		return null;
	}

	return vod;
}
