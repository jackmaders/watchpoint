import { createFileRoute } from "@tanstack/react-router";
import {
	getPlaythroughHistoryDetail,
	HistoryDetailPage,
} from "@/pages/history";

export const Route = createFileRoute("/history/$playthroughId")({
	component: HistoryDetailRoute,
	loader: async ({ params }) => {
		try {
			const playthrough = await getPlaythroughHistoryDetail({
				data: { playthroughId: params.playthroughId },
			});
			return {
				error: null,
				playthrough,
			};
		} catch (error) {
			return {
				error:
					error instanceof Error
						? error.message
						: "Failed to load session details",
				playthrough: null,
			};
		}
	},
});

function HistoryDetailRoute() {
	const { error, playthrough } = Route.useLoaderData();
	return <HistoryDetailPage error={error} playthrough={playthrough} />;
}
