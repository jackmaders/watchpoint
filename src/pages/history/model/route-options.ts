import { loadHistoryIndexPage } from "../api/loaders";
import { HistoryRouteComponent } from "../ui/history-route";
import { historySearchSchema } from "./search-params";

export const historyRouteOptions = {
	component: HistoryRouteComponent,
	loader: loadHistoryIndexPage,
	loaderDeps: ({ search }: { search: Record<string, unknown> }) => search,
	validateSearch: historySearchSchema,
};
