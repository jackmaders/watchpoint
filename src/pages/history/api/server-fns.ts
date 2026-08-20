import { createServerFn } from "@tanstack/react-start";
import type { GetPlayerHistoryOptions } from "@/shared/db";
import {
	getPlayerHistoryData,
	getPlaythroughHistoryDetailData,
} from "./history";

export const getPlayerHistory = createServerFn({ method: "GET" })
	.validator((data?: GetPlayerHistoryOptions) => data ?? {})
	.handler(async ({ data }) => {
		return getPlayerHistoryData(data);
	});

export const getPlaythroughHistoryDetail = createServerFn({ method: "GET" })
	.validator((data: { playthroughId: string }) => data)
	.handler(async ({ data }) => {
		return getPlaythroughHistoryDetailData(data.playthroughId);
	});
