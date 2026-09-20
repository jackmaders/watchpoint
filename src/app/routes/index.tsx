import { createFileRoute } from "@tanstack/react-router";
import { postsQueryOptions } from "@/entities/post";
import { PostCreateForm } from "@/features/post-create";
import { PostFeed } from "@/widgets/post-feed";

export const Route = createFileRoute("/")({
	loader: async ({ context }) => {
		await context.queryClient.query(postsQueryOptions);
	},
	component: Home,
});

function Home() {
	return (
		<div className="p-8">
			<h1 className="font-bold text-4xl">Welcome to TanStack Start</h1>
			<p className="mt-4 text-lg">
				Edit <code>src/app/routes/index.tsx</code> to get started.
			</p>

			<PostCreateForm />
			<PostFeed />
		</div>
	);
}
