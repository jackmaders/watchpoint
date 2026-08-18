import type { FormEvent } from "react";
import { useEffect, useId, useState } from "react";
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
import "./auth-prototype.css";

type Variant = "a" | "b" | "c";
type Mode = "sign-in" | "register";
type Status = "idle" | "created" | "signed-in" | "error" | "expired";

const variants = [
	{
		description: "The selected layout with the top border and current spacing.",
		key: "a" as const,
		name: "Current",
	},
	{
		description: "The selected layout with the top border and current spacing.",
		key: "b" as const,
		name: "Current",
	},
	{
		description: "The selected layout with the top border and current spacing.",
		key: "c" as const,
		name: "Current",
	},
];

function readVariant(): Variant {
	if (typeof window === "undefined") return "a";
	const value = new URLSearchParams(window.location.search).get("variant");
	return value === "b" || value === "c" ? value : "a";
}

export function AuthPrototype() {
	const [variant, setVariant] = useState<Variant>(readVariant);
	const [mode, setMode] = useState<Mode>("sign-in");
	const [open, setOpen] = useState(true);
	const [registrationEnabled, setRegistrationEnabled] = useState(true);
	const [status, setStatus] = useState<Status>("idle");
	const current = variants.find((item) => item.key === variant) ?? variants[0];

	useEffect(() => {
		const onKeyDown = (event: KeyboardEvent) => {
			if (
				["INPUT", "TEXTAREA", "BUTTON"].includes(
					(event.target as HTMLElement).tagName,
				)
			)
				return;
			if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
			event.preventDefault();
			const index = variants.findIndex((item) => item.key === variant);
			const offset = event.key === "ArrowRight" ? 1 : -1;
			selectVariant(
				variants[(index + offset + variants.length) % variants.length].key,
			);
		};
		window.addEventListener("keydown", onKeyDown);
		return () => window.removeEventListener("keydown", onKeyDown);
	});

	function selectVariant(next: Variant) {
		setVariant(next);
		const url = new URL(window.location.href);
		url.searchParams.set("variant", next);
		window.history.replaceState({}, "", url);
	}

	function submit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setStatus(mode === "register" ? "created" : "signed-in");
	}

	function toggleRegistration() {
		setRegistrationEnabled((enabled) => {
			if (enabled) setMode("sign-in");
			return !enabled;
		});
	}

	return (
		<main className="prototype-shell">
			<div aria-hidden="true" className="backdrop">
				<span>WATCHPOINT</span>
				<span>PUBLIC TRAINING CATALOGUE</span>
			</div>
			<div aria-live="polite" className="prototype-state">
				<strong>Modal prototype</strong>
				<span>
					variant={variant} · modal={open ? "open" : "closed"} · mode={mode} ·
					registration={registrationEnabled ? "on" : "off"} · status={status}
				</span>
			</div>
			<AuthModal
				mode={mode}
				onSubmit={submit}
				open={open}
				registrationEnabled={registrationEnabled}
				setMode={setMode}
				setOpen={setOpen}
				status={status}
				variant={variant}
			/>
			<section aria-label="Prototype controls" className="prototype-controls">
				<Button onClick={() => setOpen(true)} size="sm">
					Open modal
				</Button>
				<Button onClick={toggleRegistration} size="sm" variant="outline">
					Registration {registrationEnabled ? "enabled" : "disabled"}
				</Button>
				<Button
					onClick={() => setStatus("expired")}
					size="sm"
					variant="outline"
				>
					Simulate expiry
				</Button>
				<Button onClick={() => setStatus("error")} size="sm" variant="outline">
					Simulate invalid credentials
				</Button>
			</section>
			<nav aria-label="Modal variants" className="prototype-switcher">
				<Button
					aria-label="Previous variant"
					onClick={() =>
						selectVariant(
							variants[
								(variants.findIndex((item) => item.key === variant) + 2) % 3
							].key,
						)
					}
					size="icon"
					variant="outline"
				>
					←
				</Button>
				<span>
					{current.key.toUpperCase()} — {current.name}
				</span>
				<Button
					aria-label="Next variant"
					onClick={() =>
						selectVariant(
							variants[
								(variants.findIndex((item) => item.key === variant) + 1) % 3
							].key,
						)
					}
					size="icon"
					variant="outline"
				>
					→
				</Button>
			</nav>
		</main>
	);
}

function AuthModal({
	mode,
	onSubmit,
	open,
	registrationEnabled,
	setMode,
	setOpen,
	status,
	variant,
}: {
	mode: Mode;
	onSubmit: (event: FormEvent<HTMLFormElement>) => void;
	open: boolean;
	registrationEnabled: boolean;
	setMode: (mode: Mode) => void;
	setOpen: (open: boolean) => void;
	status: Status;
	variant: Variant;
}) {
	const headingId = useId();
	const variantInfo =
		variants.find((item) => item.key === variant) ?? variants[0];
	return (
		<Dialog onOpenChange={setOpen} open={open}>
			<DialogContent
				aria-labelledby={headingId}
				className={`auth-dialog auth-dialog-${variant}`}
			>
				<DialogHeader>
					<span className="eyebrow">Watchpoint / player account</span>
					<DialogTitle id={headingId}>
						{mode === "register"
							? "Create your player identity"
							: "Welcome back, player"}
					</DialogTitle>
					<DialogDescription>
						{variantInfo.description} Own your attempts and continue training
						where you left off.
					</DialogDescription>
				</DialogHeader>
				<Tabs
					className="auth-tabs"
					onValueChange={(value) => setMode(value as Mode)}
					value={mode}
				>
					<TabsList>
						<TabsTrigger value="sign-in">Sign in</TabsTrigger>
						<TabsTrigger
							className="registration-tab"
							disabled={!registrationEnabled}
							value="register"
						>
							Register
						</TabsTrigger>
					</TabsList>
					<TabsContent value="sign-in">
						<AuthForm
							mode="sign-in"
							onSubmit={onSubmit}
							status={status}
							variant={variant}
						/>
					</TabsContent>
					<TabsContent value="register">
						<AuthForm
							mode="register"
							onSubmit={onSubmit}
							status={status}
							variant={variant}
						/>
					</TabsContent>
				</Tabs>
				{!registrationEnabled && (
					<Alert aria-live="polite" className="registration-note" role="status">
						<AlertDescription className="col-start-1">
							Registration is currently unavailable. Existing players can still
							sign in.
						</AlertDescription>
					</Alert>
				)}
			</DialogContent>
		</Dialog>
	);
}

function AuthForm({
	mode,
	onSubmit,
	status,
	variant,
}: {
	mode: Mode;
	onSubmit: (event: FormEvent<HTMLFormElement>) => void;
	status: Status;
	variant: Variant;
}) {
	const fieldIds = useId();
	return (
		<form className={`auth-form auth-form-${variant}`} onSubmit={onSubmit}>
			<FieldGroup className="auth-fields">
				{mode === "register" && (
					<Field>
						<FieldLabel htmlFor={`${fieldIds}-display-name`}>
							Display name
						</FieldLabel>
						<Input
							id={`${fieldIds}-display-name`}
							name="display-name"
							placeholder="How should we call you?"
							required
						/>
					</Field>
				)}
				<Field>
					<FieldLabel htmlFor={`${fieldIds}-email`}>Email</FieldLabel>
					<Input
						id={`${fieldIds}-email`}
						name="email"
						placeholder="you@example.com"
						required
						type="email"
					/>
				</Field>
				<Field>
					<FieldLabel htmlFor={`${fieldIds}-password`}>Password</FieldLabel>
					<Input
						id={`${fieldIds}-password`}
						minLength={8}
						name="password"
						placeholder="At least 8 characters"
						required
						type="password"
					/>
					{mode === "register" && (
						<FieldDescription>Use at least 8 characters.</FieldDescription>
					)}
				</Field>
			</FieldGroup>
			{status === "error" && (
				<Alert
					aria-live="assertive"
					className="form-alert"
					variant="destructive"
				>
					<AlertDescription className="col-start-1">
						Invalid email or password.
					</AlertDescription>
				</Alert>
			)}
			{status === "expired" && (
				<Alert aria-live="polite" className="form-alert" role="status">
					<AlertDescription className="col-start-1">
						Your session expired. Sign in again to continue.
					</AlertDescription>
				</Alert>
			)}
			<Button className="auth-cta" type="submit">
				{mode === "register" ? "Create account" : "Sign in"}
			</Button>
		</form>
	);
}
