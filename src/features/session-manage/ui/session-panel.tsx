import type { SubmitEvent } from "react";
import { useCallback, useId, useState } from "react";
import { authClient } from "@/shared/auth";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Separator } from "@/shared/ui/separator";

type AuthMode = "sign-in" | "sign-up";

export function SessionPanel() {
	const { data: session, isPending } = authClient.useSession();
	const fieldId = useId();
	const [mode, setMode] = useState<AuthMode>("sign-in");
	const [error, setError] = useState<string | null>(null);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const handleSignOut = useCallback(() => {
		void authClient.signOut();
	}, []);
	const toggleMode = useCallback(() => {
		setError(null);
		setMode((currentMode) =>
			currentMode === "sign-in" ? "sign-up" : "sign-in",
		);
	}, []);
	const handleSubmit = useCallback(
		async (event: SubmitEvent<HTMLFormElement>) => {
			event.preventDefault();
			setError(null);
			setIsSubmitting(true);

			const formData = new FormData(event.currentTarget);
			const email = String(formData.get("email") ?? "");
			const password = String(formData.get("password") ?? "");

			try {
				if (mode === "sign-up") {
					const name = String(formData.get("name") ?? "");
					const result = await authClient.signUp.email({
						callbackURL: "/",
						email,
						name,
						password,
					});

					if (result.error) {
						setError(result.error.message ?? "Unable to create the account.");
					}
				} else {
					const result = await authClient.signIn.email({
						callbackURL: "/",
						email,
						password,
					});

					if (result.error) {
						setError(result.error.message ?? "Unable to sign in.");
					}
				}
			} catch {
				setError(
					"The auth service is unavailable. Check your server configuration.",
				);
			} finally {
				setIsSubmitting(false);
			}
		},
		[mode],
	);

	if (isPending) {
		return (
			<Card className="h-full min-h-112">
				<CardHeader>
					<CardDescription>Checking the current session…</CardDescription>
				</CardHeader>
			</Card>
		);
	}

	if (session?.user) {
		return (
			<Card className="h-full min-h-112">
				<CardHeader>
					<div className="flex items-center justify-between gap-4">
						<div>
							<CardDescription>Current operator</CardDescription>
							<CardTitle className="mt-1">{session.user.name}</CardTitle>
						</div>
						<Badge variant="secondary">Signed in</Badge>
					</div>
				</CardHeader>
				<CardContent className="space-y-4">
					<p className="text-muted-foreground text-sm">{session.user.email}</p>
					<Separator />
					<Button className="w-full" onClick={handleSignOut} variant="outline">
						Sign out
					</Button>
				</CardContent>
			</Card>
		);
	}

	return (
		<Card className="h-full min-h-112">
			<CardHeader>
				<CardDescription>Access the watchpoint</CardDescription>
				<CardTitle className="mt-1">
					{mode === "sign-in" ? "Welcome back" : "Create an operator account"}
				</CardTitle>
			</CardHeader>
			<CardContent>
				<form className="space-y-4" onSubmit={handleSubmit}>
					{mode === "sign-up" ? (
						<div className="space-y-2">
							<Label htmlFor={`${fieldId}-name`}>Name</Label>
							<Input
								autoComplete="name"
								id={`${fieldId}-name`}
								name="name"
								required
							/>
						</div>
					) : null}
					<div className="space-y-2">
						<Label htmlFor={`${fieldId}-email`}>Email</Label>
						<Input
							autoComplete="email"
							id={`${fieldId}-email`}
							name="email"
							required
							type="email"
						/>
					</div>
					<div className="space-y-2">
						<Label htmlFor={`${fieldId}-password`}>Password</Label>
						<Input
							autoComplete={
								mode === "sign-in" ? "current-password" : "new-password"
							}
							id={`${fieldId}-password`}
							minLength={8}
							name="password"
							required
							type="password"
						/>
					</div>
					{error ? (
						<p aria-live="polite" className="text-destructive text-sm">
							{error}
						</p>
					) : null}
					<Button className="w-full" disabled={isSubmitting} type="submit">
						{isSubmitting
							? "Working…"
							: mode === "sign-in"
								? "Sign in"
								: "Create account"}
					</Button>
				</form>
				<Separator className="my-5" />
				<button
					className="w-full text-center text-muted-foreground text-sm underline-offset-4 hover:text-foreground hover:underline"
					onClick={toggleMode}
					type="button"
				>
					{mode === "sign-in"
						? "Need an account? Create one"
						: "Already have an account? Sign in"}
				</button>
			</CardContent>
		</Card>
	);
}
