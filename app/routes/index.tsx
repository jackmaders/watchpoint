import { createFileRoute } from "@tanstack/react-router";
import { HomePage } from "@/_pages/home";
import { getPublishedVods } from "@/shared/db";

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
