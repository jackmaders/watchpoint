"use client";

import type { FormEvent } from "react";
import { useCallback, useId, useState } from "react";
import { authClient } from "@/shared/lib/auth-client";
import { Alert, AlertDescription } from "@/shared/ui/alert";
import { Button } from "@/shared/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/shared/ui/dialog";
import {
	Field,
	FieldDescription,
	FieldGroup,
	FieldLabel,
} from "@/shared/ui/field";
import { Input } from "@/shared/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/tabs";

type AuthMode = "sign-in" | "register";

export function AuthModal({
	expired = false,
	onOpenChange,
	onSuccess,
	open,
	registrationEnabled = true,
}: {
	expired?: boolean;
	onOpenChange: (open: boolean) => void;
	onSuccess?: () => void;
	open: boolean;
	registrationEnabled?: boolean;
}) {
	const [mode, setMode] = useState<AuthMode>("sign-in");
	const [error, setError] = useState<string | null>(null);
	const [busy, setBusy] = useState(false);
	const ids = useId();
	const changeMode = useCallback(
		(value: string) => setMode(value as AuthMode),
		[],
	);
	const submit = useCallback(
		async (event: FormEvent<HTMLFormElement>) => {
			event.preventDefault();
			setError(null);
			setBusy(true);
			const values = Object.fromEntries(
				new FormData(event.currentTarget).entries(),
			);
			try {
				const result =
					mode === "register"
						? await authClient.signUp.email({
								email: String(values.email),
								name: String(values.name),
								password: String(values.password),
							})
						: await authClient.signIn.email({
								email: String(values.email),
								password: String(values.password),
							});
				resolveAuthResult(
					result.error,
					() =>
						setError(
							"Invalid email or password. Please check your details and try again.",
						),
					() => {
						onSuccess?.();
						onOpenChange(false);
					},
				);
			} catch {
				setError("Unable to complete authentication. Please try again.");
			} finally {
				setBusy(false);
			}
		},
		[mode, onOpenChange, onSuccess],
	);

	return (
		<Dialog onOpenChange={onOpenChange} open={open}>
			<DialogContent
				aria-labelledby={`${ids}-title`}
				className="max-h-[calc(100vh-2rem)] overflow-y-auto"
			>
				<DialogHeader>
					<span className="font-mono text-xs font-semibold uppercase tracking-[0.2em] text-primary">
						Watchpoint / player account
					</span>
					<DialogTitle id={`${ids}-title`}>
						{mode === "register"
							? "Create your player identity"
							: "Welcome back, player"}
					</DialogTitle>
					<DialogDescription>
						Own your attempts and continue training where you left off.
					</DialogDescription>
				</DialogHeader>
				<Tabs onValueChange={changeMode} value={mode}>
					<TabsList>
						<TabsTrigger value="sign-in">Sign in</TabsTrigger>
						<TabsTrigger disabled={!registrationEnabled} value="register">
							Register
						</TabsTrigger>
					</TabsList>
					<TabsContent value="sign-in">
						<AuthForm
							busy={busy}
							error={error}
							expired={expired}
							ids={ids}
							mode="sign-in"
							onSubmit={submit}
						/>
					</TabsContent>
					<TabsContent value="register">
						<AuthForm
							busy={busy}
							error={error}
							ids={ids}
							mode="register"
							onSubmit={submit}
						/>
					</TabsContent>
				</Tabs>
				{!registrationEnabled ? (
					<Alert aria-live="polite" role="status">
						<AlertDescription>
							Registration is currently unavailable. Existing players can still
							sign in.
						</AlertDescription>
					</Alert>
				) : null}
			</DialogContent>
		</Dialog>
	);
}

export function resolveAuthResult(
	error: unknown,
	onError: () => void,
	onSuccess: () => void,
) {
	if (error) {
		onError();
		return;
	}
	onSuccess();
}

export function AccountControls() {
	const session = authClient.useSession();
	const [open, setOpen] = useState(false);
	const openModal = useCallback(() => setOpen(true), []);
	const signOut = useCallback(() => authClient.signOut(), []);
	if (session.data?.user) {
		return (
			<div className="flex items-center gap-3">
				<span className="text-sm text-muted-foreground">
					{session.data.user.name}
				</span>
				<Button onClick={signOut} size="sm" variant="outline">
					Sign out
				</Button>
			</div>
		);
	}
	return (
		<>
			<Button onClick={openModal} size="sm">
				Sign in
			</Button>
			<AuthModal onOpenChange={setOpen} open={open} />
		</>
	);
}

function AuthForm({
	busy,
	error,
	expired,
	ids,
	mode,
	onSubmit,
}: {
	busy: boolean;
	error: string | null;
	expired?: boolean;
	ids: string;
	mode: AuthMode;
	onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
	return (
		<form className="mt-4 space-y-5" onSubmit={onSubmit}>
			<FieldGroup>
				{mode === "register" ? (
					<Field>
						<FieldLabel htmlFor={`${ids}-name`}>Display name</FieldLabel>
						<Input
							autoComplete="name"
							id={`${ids}-name`}
							name="name"
							required
						/>
					</Field>
				) : null}
				<Field>
					<FieldLabel htmlFor={`${ids}-email`}>Email</FieldLabel>
					<Input
						autoComplete="email"
						id={`${ids}-email`}
						name="email"
						required
						type="email"
					/>
				</Field>
				<Field>
					<FieldLabel htmlFor={`${ids}-password`}>Password</FieldLabel>
					<Input
						autoComplete={
							mode === "register" ? "new-password" : "current-password"
						}
						id={`${ids}-password`}
						minLength={8}
						name="password"
						required
						type="password"
					/>
					{mode === "register" ? (
						<FieldDescription>Use at least 8 characters.</FieldDescription>
					) : null}
				</Field>
			</FieldGroup>
			{error ? (
				<Alert aria-live="assertive" variant="destructive">
					<AlertDescription>{error}</AlertDescription>
				</Alert>
			) : null}
			{expired ? (
				<Alert aria-live="polite" role="status">
					<AlertDescription>
						Your session expired. Sign in again to continue.
					</AlertDescription>
				</Alert>
			) : null}
			<Button className="w-full" disabled={busy} type="submit">
				{busy ? "Working…" : mode === "register" ? "Create account" : "Sign in"}
			</Button>
		</form>
	);
}
