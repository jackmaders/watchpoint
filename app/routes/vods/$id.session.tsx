import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { SessionPlayerPage } from "@/_pages/vod-detail";
import { getSessionManifest } from "@/shared/db";

const sessionSearchSchema = z.object({
	modules: z.string().optional(),
});

export const Route = createFileRoute("/vods/$id/session")({
	component: SessionPlayerRoute,
	loader: async ({ params }) => {
		const vod = await getSessionManifest(params.id);
		return { vod };
	},
	validateSearch: (search) => sessionSearchSchema.parse(search),
});

function SessionPlayerRoute() {
	const { id } = Route.useParams();
	const { vod } = Route.useLoaderData();
	const { modules } = Route.useSearch();
	return (
		<SessionPlayerPage params={{ id }} searchParams={{ modules }} vod={vod} />
	);
}
