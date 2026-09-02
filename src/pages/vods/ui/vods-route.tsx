/**
 * Route presentation component for the public VOD training catalog.
 *
 * Implements `VodsRouteComponent` extracting loader data from `routeApi` and rendering `VodsPage`.
 */
import { getRouteApi } from "@tanstack/react-router";
import { VodsPage } from "./vods-page";

const routeApi = getRouteApi("/vods/");

export function VodsRouteComponent() {
	const { registrationEnabled, vods } = routeApi.useLoaderData();
	return <VodsPage registrationEnabled={registrationEnabled} vods={vods} />;
}
