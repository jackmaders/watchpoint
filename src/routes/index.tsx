import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { type FormEvent, useEffect, useState } from "react";
import { createPost, getPosts } from "#/db/queries";

export const Route = createFileRoute("/")({
	loader: () => getPosts(),
	component: Home,
});

function Home() {
	const posts = Route.useLoaderData();
	const createPostFn = useServerFn(createPost);
	const router = useRouter();
	const [isHydrated, setIsHydrated] = useState(false);
	const [isSubmitting, setIsSubmitting] = useState(false);

	useEffect(() => {
		setIsHydrated(true);
	}, []);

	async function handleSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		const form = event.currentTarget;
		const name = new FormData(form).get("name");
		if (typeof name !== "string") return;

		setIsSubmitting(true);
		try {
			await createPostFn({ data: { name } });
			form.reset();
			await router.invalidate();
		} finally {
			setIsSubmitting(false);
		}
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
				<button disabled={!isHydrated || isSubmitting} type="submit">
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
