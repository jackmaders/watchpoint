/**
 * Public API for the individual training playthrough history inspection page slice.
 *
 * Re-exports the public interface of `src/pages/history-id/` adhering to Feature-Sliced Design (FSD).
 * Exposes loaders, query options, server functions, route options, model rules, and page UI components.
 */

export {
	historyDetailQueryOptions,
	loadHistoryIdPage,
} from "./api/loaders";
export {
	type GetHistoryDetailPayload,
	GetHistoryDetailSchema,
	getPlaythroughHistoryDetail,
} from "./api/server-fns";
export { getHistoryDetailRule } from "./model/get-history-detail";
export { historyIdRouteOptions } from "./model/route-options";
export type {
	GetHistoryDetailInput,
	GetHistoryDetailResult,
	PlayerHistoryItem,
	PlaythroughStatus,
} from "./model/types";
export { HistoryIdPage } from "./ui/history-id-page";
export { HistoryIdRouteComponent } from "./ui/history-id-route";
