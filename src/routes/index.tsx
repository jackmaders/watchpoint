import {
	useMutation,
	useQueryClient,
	useSuspenseQuery,
} from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { type FormEvent, useEffect, useState } from "react";
import type { PostInsert } from "#/api/posts";
import { createPost, postsQueryOptions } from "#/api/posts";

export const Route = createFileRoute("/")({
	loader: async ({ context }) => {
		await context.queryClient.query(postsQueryOptions);
	},
	component: Home,
});

function Home() {
	const { data: posts } = useSuspenseQuery(postsQueryOptions);
	const createPostFn = useServerFn(createPost);
	const queryClient = useQueryClient();
	const [isHydrated, setIsHydrated] = useState(false);
	const createPostMutation = useMutation({
		mutationFn: (data: PostInsert) => createPostFn({ data }),
		onSuccess: () =>
			queryClient.invalidateQueries({
				queryKey: postsQueryOptions.queryKey,
			}),
	});

	useEffect(() => {
		setIsHydrated(true);
	}, []);

	async function handleSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		const form = event.currentTarget;
		const name = new FormData(form).get("name");
		if (typeof name !== "string") return;

		await createPostMutation.mutateAsync({ name });
		form.reset();
	}

	return (
		<div className="p-8">
			<h1 className="text-4xl font-bold">Welcome to TanStack Start</h1>
			<p className="mt-4 text-lg">
				Edit <code>src/routes/index.tsx</code> to get started.
			</p>
			<form className="mt-4 flex gap-2" onSubmit={handleSubmit}>
				<label htmlFor="post-name">Post name</label>
				<input id="post-name" name="name" required type="text" />
				<button
					disabled={!isHydrated || createPostMutation.isPending}
					type="submit"
				>
					Add post
				</button>
			</form>
			<p>Posts in D1: {posts.length}</p>
			<ul>
				{posts.map((post) => (
					<li key={post.id}>{post.name}</li>
				))}
			</ul>
		</div>
	);
}
