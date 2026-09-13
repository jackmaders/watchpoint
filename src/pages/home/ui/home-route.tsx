/**
 * Route presentation component for the root homepage.
 *
 * Implements `HomeRouteComponent` subscribing to live cache data from `homePageQueryOptions` and rendering `HomePage`.
 */
import { useSuspenseQuery } from "@tanstack/react-query";
import { homePageQueryOptions } from "../api/loaders";
import { HomePage } from "./home-page";

export function HomeRouteComponent() {
	const { data } = useSuspenseQuery(homePageQueryOptions());
	return (
		<HomePage
			registrationEnabled={data?.registrationEnabled}
			vods={data?.vods}
		/>
	);
}
