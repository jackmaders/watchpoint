/**
 * Route presentation component for the playthrough performance detail view.
 *
 * Implements `HistoryIdRouteComponent` extracting loader data from `routeApi` and rendering `HistoryIdPage`.
 */
import { getRouteApi } from "@tanstack/react-router";
import { HistoryIdPage } from "./history-id-page";

const routeApi = getRouteApi("/history/$id");

export function HistoryIdRouteComponent() {
	const { error, playthrough } = routeApi.useLoaderData();
	return <HistoryIdPage error={error} playthrough={playthrough} />;
}
