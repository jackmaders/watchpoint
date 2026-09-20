import type { SubmitEvent } from "react";
import { useCreatePostMutation } from "@/api/posts";

export function CreatePostForm() {
	const createPostMutation = useCreatePostMutation();

	async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
		event.preventDefault();
		const form = event.currentTarget;
		const name = new FormData(form).get("name");
		if (typeof name !== "string" || !name.trim()) return;

		await createPostMutation.mutateAsync({ name });
		form.reset();
	}

	return (
		<form className="mt-4 flex gap-2" onSubmit={handleSubmit}>
			<label htmlFor="post-name">Post name</label>
			<input id="post-name" name="name" required type="text" />
			<button disabled={createPostMutation.isPending} type="submit">
				{createPostMutation.isPending ? "Adding..." : "Add post"}
			</button>
		</form>
	);
}
