import { desc } from "drizzle-orm";
import { type DbContext, getDb } from "../client/client";
import { type ModuleType, moduleTypeEnum, vods } from "../schema";

export interface GetSessionManifestOptions {
	modules?: string | readonly string[] | URLSearchParams;
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

function parseAndValidateModules(
	modules?: string | readonly string[] | URLSearchParams,
): { hasFilter: boolean; validModules: ModuleType[] } {
	if (modules === undefined) {
		return { hasFilter: false, validModules: [] };
	}

	let rawTokens: string[];

	if (typeof modules === "string") {
		rawTokens = modules.split(",");
	} else if (modules instanceof URLSearchParams) {
		rawTokens = modules.getAll("modules").flatMap((m) => m.split(","));
	} else {
		rawTokens = modules.flatMap((m) => m.split(","));
	}

	const tokens = rawTokens.map((m) => m.trim().toUpperCase()).filter(Boolean);

	if (tokens.length === 0) {
		return { hasFilter: false, validModules: [] };
	}

	const validModules = Array.from(
		new Set(
			tokens.filter((m): m is ModuleType =>
				moduleTypeEnum.includes(m as ModuleType),
			),
		),
	);

	return { hasFilter: true, validModules };
}

export async function getSessionManifest(
	id: string,
	options: GetSessionManifestOptions = {},
	context?: DbContext,
) {
	const db = await getDb(context);
	const { modules, publishedOnly = true } = options;
	const { hasFilter, validModules } = parseAndValidateModules(modules);

	const vod = await db.query.vods.findFirst({
		where: publishedOnly
			? (vods, { and, eq }) => and(eq(vods.id, id), eq(vods.isPublished, true))
			: (vods, { eq }) => eq(vods.id, id),
		with: {
			scenarios: {
				orderBy: (scenarios, { asc }) => [asc(scenarios.timestampSeconds)],
				where: hasFilter
					? validModules.length > 0
						? (scenarios, { inArray }) =>
								inArray(scenarios.moduleType, validModules)
						: (_scenarios, { sql }) => sql`1 = 0`
					: undefined,
			},
		},
	});

	if (!vod) {
		return null;
	}

	return vod;
}
