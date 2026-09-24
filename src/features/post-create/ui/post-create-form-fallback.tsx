import type { FormEvent } from "react";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";

function handleSubmit(event: FormEvent<HTMLFormElement>) {
	event.preventDefault();
}

export function PostCreateFormFallback() {
	return (
		<form
			aria-busy="true"
			aria-disabled="true"
			className="flex flex-col gap-3 sm:flex-row sm:items-end"
			onSubmit={handleSubmit}
		>
			<div className="grid flex-1 gap-2">
				<Label className="opacity-70">Post name</Label>
				<Input
					disabled
					name="name"
					placeholder="A signal worth keeping"
					readOnly
				/>
			</div>
			<Button disabled type="button">
				Add post
			</Button>
		</form>
	);
}
