/**
 * TanStack Start server function for retrieving published training VOD catalog items.
 *
 * Implements `getPublishedVods` using `createServerFn` and delegating to `vodService.listPublished`.
 */
import { createServerFn } from "@tanstack/react-start";
import { type PublishedVodItem, vodService } from "@/shared/db";

export const getPublishedVods = createServerFn({ method: "GET" }).handler(
	async (): Promise<PublishedVodItem[]> => {
		const result = await vodService.listPublished();
		if (!result.success) {
			throw new Error(result.error);
		}
		return result.data;
	},
);
