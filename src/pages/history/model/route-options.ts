/**
 * Route options and search parameter validation for the player match history route.
 *
 * Configures `historyRouteOptions` binding `loadHistoryIndexPage`, `HistoryRouteComponent`,
 * and `historySearchSchema` to synchronize route query params.
 */
import { loadHistoryIndexPage } from "../api/loaders";
import { HistoryRouteComponent } from "../ui/history-route";
import { historySearchSchema } from "./search-params";

export const historyRouteOptions = {
	component: HistoryRouteComponent,
	loader: loadHistoryIndexPage,
	loaderDeps: ({ search }: { search: Record<string, unknown> }) => search,
	validateSearch: historySearchSchema,
};
