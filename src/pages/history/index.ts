/**
 * Public API for the training match history page slice.
 *
 * Re-exports the public interface of `src/pages/history/` adhering to Feature-Sliced Design (FSD).
 * Exposes loaders, server functions, route options, search schemas, and UI components for performance history review.
 */

export {
	historyQueryOptions,
	loadHistoryIndexPage,
	loadPlayerHistory,
} from "./api/loaders";
export {
	type GetPlayerHistoryPayload,
	GetPlayerHistorySchema,
	getPlayerHistory,
} from "./api/server-fns";
export { getHistoryRule } from "./model/get-history";
export { historyRouteOptions } from "./model/route-options";
export {
	type HistorySearchParams,
	historySearchSchema,
	validateHistorySearch,
} from "./model/search-params";
export type {
	GetHistoryInput,
	GetHistoryResult,
	GetPlayerHistoryOptions,
	ModuleType,
	PlayerHistoryItem,
	PlayerHistoryResult,
	PlaythroughStatus,
	PublishedVodItem,
} from "./model/types";
export { HistoryEmptyState } from "./ui/history-empty-state";
export { HistoryFilterBar } from "./ui/history-filter-bar";
export { HistoryItemCard } from "./ui/history-item-card";
export { HistoryPage } from "./ui/history-page";
export { HistoryRouteComponent } from "./ui/history-route";
export {
	HistoryErrorState,
	HistoryLoadingSkeleton,
} from "./ui/history-skeleton";
