import type { SubmitEvent } from "react";
import { useCallback, useId } from "react";
import { useCreatePostMutation } from "@/api/posts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function CreatePostForm() {
	const postNameId = useId();
	const { isPending, mutateAsync } = useCreatePostMutation();

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
		<form
			className="flex flex-col gap-3 sm:flex-row sm:items-end"
			onSubmit={handleSubmit}
		>
			<div className="grid flex-1 gap-2">
				<Label htmlFor={postNameId}>Post name</Label>
				<Input
					id={postNameId}
					name="name"
					placeholder="A signal worth keeping"
					required
				/>
			</div>
			<Button disabled={isPending} type="submit">
				{isPending ? "Adding..." : "Add post"}
			</Button>
		</form>
	);
}
