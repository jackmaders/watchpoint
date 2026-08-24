import { getRouteApi } from "@tanstack/react-router";
import { HomePage } from "./home-page";

const routeApi = getRouteApi("/");

export function HomeRouteComponent() {
	const { registrationEnabled, vods } = routeApi.useLoaderData();
	return <HomePage registrationEnabled={registrationEnabled} vods={vods} />;
}
