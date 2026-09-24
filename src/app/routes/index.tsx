import { createFileRoute } from "@tanstack/react-router";
import { postListQueryOptions } from "@/entities/post";
import { publishedVodListQueryOptions } from "@/entities/vod";
import { HomePage } from "@/pages/home";

export const Route = createFileRoute("/")({
	loader: async ({ context }) => {
		await context.queryClient.ensureQueryData(postListQueryOptions);
		await context.queryClient.ensureQueryData(publishedVodListQueryOptions);
	},
	component: HomePage,
});
