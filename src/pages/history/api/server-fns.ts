import { createServerFn } from "@tanstack/react-start";
import type { GetPlayerHistoryOptions } from "@/shared/db";
import { getPlayerHistoryData } from "./history";

export const getPlayerHistory = createServerFn({ method: "GET" })
	.validator((data?: GetPlayerHistoryOptions) => data ?? {})
	.handler(async ({ data }) => {
		return getPlayerHistoryData(data);
	});
