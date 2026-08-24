import { loadHistoryIdPage } from "../api/loaders";
import { HistoryIdRouteComponent } from "../ui/history-id-route";

export const historyIdRouteOptions = {
	component: HistoryIdRouteComponent,
	loader: loadHistoryIdPage,
};
