import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { getSessionManifest, SessionPlayerPage } from "@/pages/vod-detail";

const sessionSearchSchema = z.object({
	modules: z.string().optional(),
});
type SessionSearch = z.infer<typeof sessionSearchSchema>;

function validateSessionSearch(search: unknown): SessionSearch {
	return sessionSearchSchema.parse(search);
}

export const Route = createFileRoute("/vods/$id/session")({
	component: SessionPlayerRoute,
	loader: async ({
		deps,
		params,
	}: {
		deps: SessionSearch;
		params: { id: string };
	}) => {
		const vod = await getSessionManifest({
			data: {
				modules: deps.modules,
				vodId: params.id,
			},
		});
		return { vod };
	},
	loaderDeps: ({ search }) => ({
		modules: (search as SessionSearch).modules,
	}),
	validateSearch: validateSessionSearch,
});

function SessionPlayerRoute() {
	const { id } = Route.useParams();
	const { vod } = Route.useLoaderData();
	const { modules } = Route.useSearch() as SessionSearch;
	return (
		<SessionPlayerPage params={{ id }} searchParams={{ modules }} vod={vod} />
	);
}
