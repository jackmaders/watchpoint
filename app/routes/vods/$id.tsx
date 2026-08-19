import { createFileRoute } from "@tanstack/react-router";
import { getSessionManifest, VodDetailPage } from "@/pages/vod-detail";

export const Route = createFileRoute("/vods/$id")({
	component: VodDetailRoute,
	loader: async ({ params }) => {
		const vod = await getSessionManifest({ data: { vodId: params.id } });
		return {
			registrationEnabled:
				process.env.BETTER_AUTH_ALLOW_REGISTRATION === "true",
			vod,
		};
	},
});

function VodDetailRoute() {
	const { id } = Route.useParams();
	const { registrationEnabled, vod } = Route.useLoaderData();
	return (
		<VodDetailPage
			params={{ id }}
			registrationEnabled={registrationEnabled}
			vod={vod}
		/>
	);
}
