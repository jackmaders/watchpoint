/**
 * Route presentation component for the VOD detail and briefing view.
 *
 * Implements `VodsIdRouteComponent` extracting loaded VOD data from `routeApi` and rendering `VodsIdPage`.
 */
import { getRouteApi } from "@tanstack/react-router";
import { VodsIdPage } from "./vods-id-page";

const routeApi = getRouteApi("/vods/$id");

export function VodsIdRouteComponent() {
	const { vod } = routeApi.useLoaderData();
	return <VodsIdPage vod={vod} />;
}
