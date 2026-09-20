import type { SubmitEvent } from "react";
import { useCallback, useId, useState } from "react";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { usePostCreateMutation } from "../api/use-post-create-mutation";

export function PostCreateForm() {
	const postNameId = useId();
	const { isPending, mutateAsync } = usePostCreateMutation();
	const [error, setError] = useState<string | null>(null);

	const handleSubmit = useCallback(
		async (event: SubmitEvent<HTMLFormElement>) => {
			event.preventDefault();
			const form = event.currentTarget;
			const name = new FormData(form).get("name");
			if (typeof name !== "string" || !name.trim()) {
				return;
			}

			setError(null);
			try {
				await mutateAsync({ name });
				form.reset();
			} catch {
				setError("Sign in to add a watchpoint.");
			}
		},
		[mutateAsync],
	);

	return (
		<>
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
			{error ? (
				<p
					aria-live="polite"
					className="mt-2 text-destructive text-sm"
					role="alert"
				>
					{error}
				</p>
			) : null}
		</>
	);
}
