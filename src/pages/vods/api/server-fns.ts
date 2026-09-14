/**
 * TanStack Start server function for retrieving published training VOD catalog items.
 *
 * Implements `getPublishedVods` using `createServerFn` and delegating to `queryVods`.
 */
import { createServerFn } from "@tanstack/react-start";
import { createDbClient, queryVods, type vods } from "@/shared/db";

export type PublishedVodItem = typeof vods.$inferSelect;

export const getPublishedVods = createServerFn({ method: "GET" }).handler(
	async (): Promise<PublishedVodItem[]> => {
		const db = createDbClient();
		return queryVods(
			{
				filter: { isPublished: { eq: true } },
				order: { createdAt: "desc" },
			},
			db,
		);
	},
);
