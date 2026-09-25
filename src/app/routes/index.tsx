import { createFileRoute } from "@tanstack/react-router";
import { postListQueryOptions } from "@/entities/post";
import { publishedVodListQueryOptions } from "@/entities/vod";
import { HomePage } from "@/pages/home";

export const Route = createFileRoute("/")({
	loader: async ({ context }) => {
		await Promise.all([
			context.queryClient.ensureQueryData(postListQueryOptions),
			context.queryClient.ensureQueryData(publishedVodListQueryOptions),
		]);
	},
	component: HomePage,
});
