import { createFileRoute } from "@tanstack/react-router";
import { postListQueryOptions } from "@/entities/post";
import { HomePage } from "@/pages/home";

export const Route = createFileRoute("/")({
	loader: async ({ context }) => {
		await context.queryClient.query(postListQueryOptions);
	},
	component: HomePage,
});
