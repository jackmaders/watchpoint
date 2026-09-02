/**
 * Route component adapter for the interactive VOD training session view.
 *
 * Implements `VodsIdSessionRouteComponent` reading URL route parameters, session loader data, and search state
 * from `routeApi` and rendering `SessionPlayerRouteView`.
 */
import { getRouteApi } from "@tanstack/react-router";
import { useCallback } from "react";
import type { SessionSearch } from "../model/session-search";
import { SessionPlayerRouteView } from "./session-player-route-view";

const routeApi = getRouteApi("/vods/$id/session");

export function VodsIdSessionRouteComponent() {
	const { id } = routeApi.useParams();
	const { playthroughId, scenarioSnapshotIds, vod } = routeApi.useLoaderData();
	const search = routeApi.useSearch() as SessionSearch;
	const navigate = routeApi.useNavigate();

	const handleNavigateSearch = useCallback(
		(
			searchUpdater: (prev: Record<string, unknown>) => Record<string, unknown>,
		) => {
			navigate({ search: searchUpdater });
		},
		[navigate],
	);

	return (
		<SessionPlayerRouteView
			onNavigateSearch={handleNavigateSearch}
			playthroughId={playthroughId}
			scenarioSnapshotIds={scenarioSnapshotIds}
			search={search}
			vod={vod}
			vodId={id}
		/>
	);
}
