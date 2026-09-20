import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { postsQueryOptions } from "#/api/posts";
import { CreatePostForm } from "#/components/create-post-form";

export const Route = createFileRoute("/")({
	loader: async ({ context }) => {
		await context.queryClient.query(postsQueryOptions);
	},
	component: Home,
});

function Home() {
	const { data: posts } = useSuspenseQuery(postsQueryOptions);

	return (
		<div className="p-8">
			<h1 className="text-4xl font-bold">Welcome to TanStack Start</h1>
			<p className="mt-4 text-lg">
				Edit <code>src/routes/index.tsx</code> to get started.
			</p>

			<CreatePostForm />

			<p>Posts in D1: {posts.length}</p>
			<ul>
				{posts.map((post) => (
					<li key={post.id}>{post.name}</li>
				))}
			</ul>
		</div>
	);
}
