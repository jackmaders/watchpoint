import type { SubmitEvent } from "react";
import { useCallback, useId } from "react";
import { usePostCreateMutation } from "../api/post-create";

export function PostCreateForm() {
	const postNameId = useId();
	const { isPending, mutateAsync } = usePostCreateMutation();

	const handleSubmit = useCallback(
		async (event: SubmitEvent<HTMLFormElement>) => {
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
