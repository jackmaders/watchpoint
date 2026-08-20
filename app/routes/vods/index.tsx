import { createFileRoute } from "@tanstack/react-router";
import { getPublishedVods, VodsPage } from "@/pages/vods";
import { isRegistrationOpen } from "@/shared/lib/auth";

export const Route = createFileRoute("/vods/")({
	component: VodsRoute,
	loader: async () => {
		const [vods, registrationEnabled] = await Promise.all([
			getPublishedVods(),
			isRegistrationOpen(),
		]);
		return { registrationEnabled, vods };
	},
});

function VodsRoute() {
	const { registrationEnabled, vods } = Route.useLoaderData();
	return <VodsPage registrationEnabled={registrationEnabled} vods={vods} />;
}
