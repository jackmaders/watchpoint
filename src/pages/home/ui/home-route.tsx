/**
 * Route presentation component for the root homepage.
 *
 * Implements `HomeRouteComponent` extracting loader data from `routeApi` and rendering `HomePage`.
 */
import { getRouteApi } from "@tanstack/react-router";
import { HomePage } from "./home-page";

const routeApi = getRouteApi("/");

export function HomeRouteComponent() {
	const { registrationEnabled, vods } = routeApi.useLoaderData();
	return <HomePage registrationEnabled={registrationEnabled} vods={vods} />;
}
