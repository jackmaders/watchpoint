/**
 * Route options and loader bindings for the playthrough detail view.
 *
 * Configures `historyIdRouteOptions` binding `loadHistoryIdPage` to `HistoryIdRouteComponent`.
 */
import { loadHistoryIdPage } from "../api/loaders";
import { HistoryIdRouteComponent } from "../ui/history-id-route";

export const historyIdRouteOptions = {
	component: HistoryIdRouteComponent,
	loader: loadHistoryIdPage,
};
