import { createFileRoute } from "@tanstack/react-router";
import { postsQueryOptions } from "@/entities/post";
import { HomePage } from "@/pages/home";

export const Route = createFileRoute("/")({
	loader: async ({ context }) => {
		await context.queryClient.query(postsQueryOptions);
	},
	component: HomePage,
});
