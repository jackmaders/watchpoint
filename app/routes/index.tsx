import { createFileRoute } from "@tanstack/react-router";
import { HomePage } from "@/pages/home";
import { getPublishedVods } from "@/pages/vods";
import { isRegistrationOpen } from "@/shared/lib/auth";

export const Route = createFileRoute("/")({
	component: HomeRoute,
	loader: async () => {
		const [vods, registrationEnabled] = await Promise.all([
			getPublishedVods(),
			isRegistrationOpen(),
		]);
		return {
			registrationEnabled,
			vods,
		};
	},
});

function HomeRoute() {
	const { registrationEnabled, vods } = Route.useLoaderData();
	return <HomePage registrationEnabled={registrationEnabled} vods={vods} />;
}
