import { createFileRoute } from "@tanstack/react-router";
import { HomePage } from "@/pages/home";
import { getPublishedVods } from "@/pages/vods";

export const Route = createFileRoute("/")({
	component: HomeRoute,
	loader: async () => {
		const vods = await getPublishedVods();
		return {
			registrationEnabled:
				process.env.BETTER_AUTH_ALLOW_REGISTRATION === "true",
			vods,
		};
	},
});

function HomeRoute() {
	const { registrationEnabled, vods } = Route.useLoaderData();
	return <HomePage registrationEnabled={registrationEnabled} vods={vods} />;
}
