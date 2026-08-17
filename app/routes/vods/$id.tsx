import { createFileRoute } from "@tanstack/react-router";
import { getSessionManifest, VodDetailPage } from "@/pages/vod-detail";

export const Route = createFileRoute("/vods/$id")({
	component: VodDetailRoute,
	loader: async ({ params }) => {
		const vod = await getSessionManifest({ data: { vodId: params.id } });
		return { vod };
	},
});

function VodDetailRoute() {
	const { id } = Route.useParams();
	const { vod } = Route.useLoaderData();
	return <VodDetailPage params={{ id }} vod={vod} />;
}
