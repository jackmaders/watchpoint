/**
 * Route component adapter for the training match history page.
 *
 * Implements `HistoryRouteComponent` extracting loader data and URL search parameters from `routeApi`
 * and rendering `HistoryPage`.
 */
import { getRouteApi } from "@tanstack/react-router";
import { useCallback } from "react";
import type { HistorySearchParams } from "../model/search-params";
import { HistoryPage } from "./history-page";

const routeApi = getRouteApi("/history/");

export function HistoryRouteComponent() {
	const search = routeApi.useSearch() as HistorySearchParams;
	const { data, error, registrationEnabled, vods } = routeApi.useLoaderData();
	const navigate = routeApi.useNavigate();

	const handleFilterChange = useCallback(
		(newParams: HistorySearchParams) => {
			navigate({
				search: (prev: Record<string, unknown>) => ({
					...prev,
					...newParams,
				}),
				to: ".",
			});
		},
		[navigate],
	);

	return (
		<HistoryPage
			data={data}
			error={error}
			onFilterChange={handleFilterChange}
			registrationEnabled={registrationEnabled}
			searchParams={search}
			vods={vods}
		/>
	);
}
