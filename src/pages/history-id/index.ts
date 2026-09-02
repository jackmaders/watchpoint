/**
 * Public API for the individual training playthrough history inspection page slice.
 *
 * Re-exports the public interface of `src/pages/history-id/` adhering to Feature-Sliced Design (FSD).
 * Exposes loaders, server functions, route options, and page UI components.
 */
export { loadHistoryIdPage } from "./api/loaders";
export { getPlaythroughHistoryDetail } from "./api/server-fns";
export { historyIdRouteOptions } from "./model/route-options";
export { HistoryIdPage } from "./ui/history-id-page";
export { HistoryIdRouteComponent } from "./ui/history-id-route";
