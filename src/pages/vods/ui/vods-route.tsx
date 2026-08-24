import { getRouteApi } from "@tanstack/react-router";
import { VodsPage } from "./vods-page";

const routeApi = getRouteApi("/vods/");

export function VodsRouteComponent() {
	const { registrationEnabled, vods } = routeApi.useLoaderData();
	return <VodsPage registrationEnabled={registrationEnabled} vods={vods} />;
}
