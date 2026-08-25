import { createServerFn } from "@tanstack/react-start";
import {
	getPublishedVods as dbGetPublishedVods,
	type PublishedVodItem,
} from "@/shared/db";

export const getPublishedVods = createServerFn({ method: "GET" }).handler(
	async (): Promise<PublishedVodItem[]> => {
		const result = await dbGetPublishedVods();
		if (!result.success) {
			throw new Error(result.error);
		}
		return result.data;
	},
);
