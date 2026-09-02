/**
 * TanStack Start server function for fetching individual playthrough telemetry details.
 *
 * Implements `getPlaythroughHistoryDetail` using `createServerFn`, validating playthrough ID parameters
 * and invoking `getPlaythroughHistoryDetailData`.
 */
import { createServerFn } from "@tanstack/react-start";
import { getPlaythroughHistoryDetailData } from "./history-id";

export const getPlaythroughHistoryDetail = createServerFn({ method: "GET" })
	.validator((data: { id: string }) => data)
	.handler(async ({ data }) => {
		return getPlaythroughHistoryDetailData(data.id);
	});
