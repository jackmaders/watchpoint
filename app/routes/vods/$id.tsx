import { createFileRoute } from "@tanstack/react-router";
import { VodDetailPage } from "@/pages/vod-detail";
import { getSessionManifest } from "@/shared/db";

export const Route = createFileRoute("/vods/$id")({
	component: VodDetailRoute,
	loader: async ({ params }) => {
		const vod = await getSessionManifest(params.id);
		return { vod };
	},
});

function VodDetailRoute() {
	const { id } = Route.useParams();
	const { vod } = Route.useLoaderData();
	return <VodDetailPage params={{ id }} vod={vod} />;
}
