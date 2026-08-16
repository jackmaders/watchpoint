import { createFileRoute } from "@tanstack/react-router";
import { VodsPage } from "@/pages/vods";
import { getPublishedVods } from "@/shared/db";

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
