import { createFileRoute } from "@tanstack/react-router";
import type { LessonSummary } from "@/entities/lesson";
import { postListQueryOptions } from "@/entities/post";
import { HomePage } from "@/pages/home";

interface HomeRouteData {
	lessonSummaryPreview: LessonSummary | null;
}

export const Route = createFileRoute("/")({
	loader: async ({ context }) => {
		await context.queryClient.ensureQueryData(postListQueryOptions);
		return { lessonSummaryPreview: null } satisfies HomeRouteData;
	},
	component: HomePage,
});
