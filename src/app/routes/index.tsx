import { createFileRoute } from "@tanstack/react-router";
import { postListQueryOptions } from "@/entities/post";
import { HomePage } from "@/pages/home";
import { parseVodTimestamp, VOD_TIMESTAMP_SEARCH_PARAM } from "@/shared/video";

export const Route = createFileRoute("/")({
	validateSearch: (search: Record<string, unknown>) => {
		const timestamp = search[VOD_TIMESTAMP_SEARCH_PARAM];
		return timestamp === undefined
			? {}
			: { timestamp: parseVodTimestamp(timestamp) };
	},
	loader: async ({ context }) => {
		await context.queryClient.ensureQueryData(postListQueryOptions);
	},
	component: HomePage,
});
