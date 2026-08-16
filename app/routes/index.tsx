import { createFileRoute } from "@tanstack/react-router";
import { HomePage } from "@/pages/home";
import { getPublishedVods } from "@/pages/vods";

export const Route = createFileRoute("/")({
	component: HomeRoute,
	loader: async () => {
		const vods = await getPublishedVods();
		return { vods };
	},
});

function HomeRoute() {
	const { vods } = Route.useLoaderData();
	return <HomePage vods={vods} />;
}
