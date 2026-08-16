import { createFileRoute } from "@tanstack/react-router";
import { VodDetailPage } from "@/_pages/vod-detail";
import { getVodById } from "@/shared/db";

export const Route = createFileRoute("/vods/$id")({
	component: VodDetailRoute,
	loader: async ({ params }) => {
		const vod = await getVodById(params.id);
		return { vod };
	},
});

function VodDetailRoute() {
	const { id } = Route.useParams();
	const { vod } = Route.useLoaderData();
	return <VodDetailPage params={{ id }} vod={vod} />;
}
