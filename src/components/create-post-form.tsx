import type { SubmitEvent } from "react";
import { useCallback, useId } from "react";
import { useCreatePostMutation } from "@/api/posts";

export function CreatePostForm(): React.JSX.Element {
	const postNameId = useId();
	const { isPending, mutateAsync } = useCreatePostMutation();

	const handleSubmit = useCallback(
		async (event: SubmitEvent<HTMLFormElement>): Promise<void> => {
			event.preventDefault();
			const form = event.currentTarget;
			const name = new FormData(form).get("name");
			if (typeof name !== "string" || !name.trim()) {
				return;
			}

			await mutateAsync({ name });
			form.reset();
		},
		[mutateAsync],
	);

	return (
		<form className="mt-4 flex gap-2" onSubmit={handleSubmit}>
			<label htmlFor={postNameId}>Post name</label>
			<input id={postNameId} name="name" required type="text" />
			<button disabled={isPending} type="submit">
				{isPending ? "Adding..." : "Add post"}
			</button>
		</form>
	);
}
