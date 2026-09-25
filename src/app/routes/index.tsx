import { createFileRoute } from "@tanstack/react-router";
import type { LessonSummary } from "@/entities/lesson";
import { postListQueryOptions } from "@/entities/post";
import { publishedVodListQueryOptions } from "@/entities/vod";
import { HomePage } from "@/pages/home";

interface HomeRouteData {
	lessonSummaryPreview: LessonSummary | null;
}

export const Route = createFileRoute("/")({
	loader: async ({ context }) => {
		await Promise.all([
			context.queryClient.ensureQueryData(postListQueryOptions),
			context.queryClient.ensureQueryData(publishedVodListQueryOptions),
		]);
		return { lessonSummaryPreview: null } satisfies HomeRouteData;
	},
	component: HomePage,
});
