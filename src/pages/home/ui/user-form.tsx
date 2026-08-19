import { useForm } from "@tanstack/react-form";
import type * as React from "react";
import { useCallback, useId, useState } from "react";
import { z } from "zod";
import { authClient } from "@/shared/lib/auth-client";

const authSchema = z.object({
	email: z.string().email("Invalid email address"),
	name: z.string().optional(),
	password: z.string().min(8, "Password must be at least 8 characters"),
});

export type UserFormData = z.infer<typeof authSchema>;
export type AuthMode = "sign-in" | "register";

export function formatError(err: unknown): string {
	if (typeof err === "string") return err;
	if (err && typeof err === "object" && "message" in err)
		return String(err.message);
	return "Unable to complete authentication";
}

// biome-ignore lint/complexity/noExcessiveLinesPerFunction: the auth form keeps its submit lifecycle beside the rendered fields
export function UserForm() {
	const { data: session, isPending } = authClient.useSession();
	const [mode, setMode] = useState<AuthMode>("sign-in");
	const [error, setError] = useState<string | null>(null);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const headingId = useId();
	const form = useForm({
		defaultValues: { email: "", name: "", password: "" },
		onSubmit: async ({ value }) => {
			setError(null);
			if (mode === "register" && value.name.trim().length < 2) {
				setError("Name must be at least 2 characters");
				return;
			}
			if (!authSchema.safeParse(value).success) {
				setError(
					"Enter a valid email and a password of at least 8 characters.",
				);
				return;
			}
			setIsSubmitting(true);
			const result =
				mode === "register"
					? await authClient.signUp.email({
							email: value.email,
							name: value.name,
							password: value.password,
						})
					: await authClient.signIn.email({
							email: value.email,
							password: value.password,
						});
			setIsSubmitting(false);
			if (result.error) setError("Unable to authenticate with those details.");
		},
	});
	const handleSignOut = useCallback(() => {
		void authClient.signOut();
	}, []);
	const handleModeChange = useCallback(() => {
		setMode((current) => (current === "register" ? "sign-in" : "register"));
		setError(null);
	}, []);
	const handleSubmit = useCallback(
		(event: React.FormEvent<HTMLFormElement>) => {
			event.preventDefault();
			void form.handleSubmit();
		},
		[form],
	);

	if (isPending)
		return <p className="text-sm text-muted-foreground">Checking session…</p>;
	if (session?.user) {
		return (
			<div className="flex items-center justify-between gap-4">
				<p className="text-sm text-muted-foreground">
					Signed in as{" "}
					<span className="font-semibold text-foreground">
						{session.user.name}
					</span>
				</p>
				<button
					className="text-sm font-semibold text-primary hover:underline"
					onClick={handleSignOut}
					type="button"
				>
					Sign out
				</button>
			</div>
		);
	}

	return (
		<section aria-labelledby={headingId} className="space-y-4">
			<div className="flex items-center justify-between gap-4">
				<h2 className="text-lg font-semibold" id={headingId}>
					{mode === "register"
						? "Create your player account"
						: "Player sign in"}
				</h2>
				<button
					className="text-sm font-semibold text-primary hover:underline"
					onClick={handleModeChange}
					type="button"
				>
					{mode === "register" ? "Sign in" : "Create account"}
				</button>
			</div>
			{error ? (
				<p className="text-sm text-destructive" role="alert">
					{error}
				</p>
			) : null}
			<form className="space-y-3" onSubmit={handleSubmit}>
				{mode === "register" && (
					<form.Field name="name">
						{(field) => (
							<AuthInput
								field={field}
								label="Display name"
								placeholder="How should we call you?"
							/>
						)}
					</form.Field>
				)}
				<form.Field name="email">
					{(field) => (
						<AuthInput
							field={field}
							label="Email"
							placeholder="you@example.com"
							type="email"
						/>
					)}
				</form.Field>
				<form.Field name="password">
					{(field) => (
						<AuthInput
							field={field}
							label="Password"
							placeholder="At least 8 characters"
							type="password"
						/>
					)}
				</form.Field>
				<button
					className="h-10 w-full rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50"
					disabled={isSubmitting}
					type="submit"
				>
					{isSubmitting
						? "Working…"
						: mode === "register"
							? "Create account"
							: "Sign in"}
				</button>
			</form>
		</section>
	);
}

function AuthInput({
	field,
	label,
	placeholder,
	type = "text",
}: {
	field: {
		handleChange: (value: string) => void;
		name: string;
		state: { meta: { errors: unknown[] }; value: string };
	};
	label: string;
	placeholder: string;
	type?: string;
}) {
	const handleChange = useCallback(
		(event: React.ChangeEvent<HTMLInputElement>) => {
			field.handleChange(event.target.value);
		},
		[field],
	);
	return (
		<label
			className="block space-y-1 text-sm font-medium"
			htmlFor={`auth-${field.name}`}
		>
			<span>{label}</span>
			<input
				className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
				id={`auth-${field.name}`}
				name={field.name}
				onChange={handleChange}
				placeholder={placeholder}
				type={type}
				value={field.state.value}
			/>
		</label>
	);
}
