import { createServerFn } from "@tanstack/react-start";
import { getPlaythroughHistoryDetailData } from "./history-id";

export const getPlaythroughHistoryDetail = createServerFn({ method: "GET" })
	.validator((data: { id: string }) => data)
	.handler(async ({ data }) => {
		return getPlaythroughHistoryDetailData(data.id);
	});
