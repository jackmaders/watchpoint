import { createServerFn } from "@tanstack/react-start";
import { getPublishedVods as dbGetPublishedVods } from "@/shared/db";

export const getPublishedVods = createServerFn({ method: "GET" }).handler(
	async () => {
		return dbGetPublishedVods();
	},
);
