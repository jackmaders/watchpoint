import { createFileRoute } from "@tanstack/react-router";
import { getPublishedVods, VodsPage } from "@/pages/vods";

export const Route = createFileRoute("/vods/")({
	component: VodsRoute,
	loader: async () => {
		const vods = await getPublishedVods();
		return { vods };
	},
});

function VodsRoute() {
	const { vods } = Route.useLoaderData();
	return <VodsPage vods={vods} />;
}
