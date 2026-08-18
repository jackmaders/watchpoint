import type { FormEvent, ReactNode } from "react";
import { useEffect, useId, useState } from "react";
import { Button } from "@/shared/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/shared/ui/dialog";
import "./auth-prototype.css";

type Variant = "a" | "b" | "c";
type Mode = "sign-in" | "register";
type Status = "idle" | "created" | "signed-in" | "error" | "expired";

const variants: { key: Variant; name: string; description: string }[] = [
	{
		description: "A focused public catalogue with a quiet auth interruption.",
		key: "a",
		name: "Field briefing",
	},
	{
		description:
			"A cinematic training preview that keeps the next action visible.",
		key: "b",
		name: "Split-screen loadout",
	},
	{
		description:
			"A compact shell that keeps catalogue, history, and account close.",
		key: "c",
		name: "Command rail",
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
	const [destination, setDestination] = useState("King's Row / Session start");
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

	function openAuth(nextMode: Mode) {
		setMode(nextMode);
		setStatus("idle");
		setOpen(true);
	}

	function submit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setStatus(mode === "register" ? "created" : "signed-in");
	}

	return (
		<main className={`prototype-shell variant-${variant}`}>
			<div aria-live="polite" className="prototype-state">
				<strong>Prototype state</strong>
				<span>
					variant={variant} · modal={open ? "open" : "closed"} · mode={mode} ·
					registration={registrationEnabled ? "on" : "off"} · status={status} ·
					return={destination}
				</span>
			</div>
			{variant === "a" && <PublicShellA current={current} onOpen={openAuth} />}
			{variant === "b" && <PublicShellB current={current} onOpen={openAuth} />}
			{variant === "c" && <PublicShellC current={current} onOpen={openAuth} />}
			<AuthDialog
				mode={mode}
				onSubmit={submit}
				open={open}
				registrationEnabled={registrationEnabled}
				setMode={setMode}
				setOpen={setOpen}
				status={status}
			/>
			<section aria-label="Prototype controls" className="prototype-controls">
				<Button onClick={() => setOpen(true)} size="sm">
					Open auth modal
				</Button>
				<Button
					onClick={() => setRegistrationEnabled((value) => !value)}
					size="sm"
					variant="outline"
				>
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
				<label>
					Return destination{" "}
					<input
						onChange={(event) => setDestination(event.target.value)}
						value={destination}
					/>
				</label>
			</section>
			<nav aria-label="Prototype variants" className="prototype-switcher">
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

function PublicShellA({
	current,
	onOpen,
}: {
	current: (typeof variants)[number];
	onOpen: (mode: Mode) => void;
}) {
	return (
		<div className="public-shell public-shell-a">
			<header>
				<span className="eyebrow">Watchpoint / Field briefing</span>
				<div className="shell-actions">
					<Button onClick={() => onOpen("sign-in")} variant="ghost">
						Sign in
					</Button>
					<Button onClick={() => onOpen("register")}>Create account</Button>
				</div>
			</header>
			<div className="shell-hero">
				<div>
					<h1>Train the read before the fight.</h1>
					<p>{current.description}</p>
					<Button onClick={() => onOpen("register")} size="lg">
						Start training <span aria-hidden="true">→</span>
					</Button>
				</div>
				<div className="catalog-card">
					<span className="eyebrow">Published VOD / 04</span>
					<h2>King's Row: hold or rotate?</h2>
					<p>5 scenarios · 12 minutes</p>
					<Button onClick={() => onOpen("sign-in")} variant="outline">
						View training
					</Button>
				</div>
			</div>
		</div>
	);
}

function PublicShellB({
	current,
	onOpen,
}: {
	current: (typeof variants)[number];
	onOpen: (mode: Mode) => void;
}) {
	return (
		<div className="public-shell public-shell-b">
			<div className="training-preview">
				<div className="preview-grid" />
				<span className="eyebrow">Live read / King's Row</span>
				<h1>Pause. Predict. Improve.</h1>
				<p>{current.description}</p>
				<span className="preview-time">00:43:18 · next scenario ahead</span>
			</div>
			<aside>
				<span className="eyebrow">Your next decision</span>
				<h2>Ready to test your read?</h2>
				<p>Sign in to own your attempts and continue where you left off.</p>
				<Button className="w-full" onClick={() => onOpen("sign-in")}>
					Sign in to train
				</Button>
				<Button
					className="w-full"
					onClick={() => onOpen("register")}
					variant="outline"
				>
					Create an account
				</Button>
			</aside>
		</div>
	);
}

function PublicShellC({
	current,
	onOpen,
}: {
	current: (typeof variants)[number];
	onOpen: (mode: Mode) => void;
}) {
	return (
		<div className="public-shell public-shell-c">
			<aside className="command-rail">
				<span className="rail-mark">W</span>
				<span className="eyebrow">Watchpoint</span>
				<h1>Your next read is waiting.</h1>
				<p>{current.description}</p>
				<div className="rail-links">
					<span>VOD catalogue</span>
					<span>Training history</span>
					<span>Account</span>
				</div>
			</aside>
			<section className="catalog-list">
				<header>
					<div>
						<span className="eyebrow">Training catalogue</span>
						<h2>Choose a VOD to begin.</h2>
					</div>
					<Button onClick={() => onOpen("sign-in")} variant="outline">
						Sign in
					</Button>
				</header>
				<div className="catalog-row">
					<div>
						<strong>King's Row: hold or rotate?</strong>
						<span>5 scenarios · Strategy · Tactics · Ultimate Tracking</span>
					</div>
					<Button onClick={() => onOpen("register")}>Start training</Button>
				</div>
				<div className="catalog-row">
					<div>
						<strong>New Queen Street: read the flank</strong>
						<span>7 scenarios · Spatial Awareness · Cooldown Tracking</span>
					</div>
					<Button onClick={() => onOpen("register")} variant="outline">
						Preview VOD
					</Button>
				</div>
			</section>
		</div>
	);
}

function AuthDialog({
	mode,
	open,
	registrationEnabled,
	setMode,
	setOpen,
	status,
	onSubmit,
}: {
	mode: Mode;
	open: boolean;
	registrationEnabled: boolean;
	setMode: (mode: Mode) => void;
	setOpen: (open: boolean) => void;
	status: Status;
	onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
	const fieldIds = useId();
	const headingId = useId();
	return (
		<Dialog onOpenChange={setOpen} open={open}>
			<DialogContent aria-labelledby={headingId} className="auth-dialog">
				<DialogHeader>
					<DialogTitle id={headingId}>
						{mode === "register"
							? "Create your player identity"
							: "Welcome back, player"}
					</DialogTitle>
					<DialogDescription>
						{mode === "register"
							? "Own your attempts and pick up where your training left off."
							: "Continue to your next decision."}
					</DialogDescription>
				</DialogHeader>
				<div className="auth-tabs" role="tablist">
					<Button
						aria-selected={mode === "sign-in"}
						onClick={() => setMode("sign-in")}
						role="tab"
						variant={mode === "sign-in" ? "default" : "ghost"}
					>
						Sign in
					</Button>
					<Button
						aria-selected={mode === "register"}
						disabled={!registrationEnabled}
						onClick={() => setMode("register")}
						role="tab"
						variant={mode === "register" ? "default" : "ghost"}
					>
						Register
					</Button>
				</div>
				{!registrationEnabled && (
					<p aria-live="polite" className="registration-note">
						Registration is currently unavailable. Existing players can still
						sign in.
					</p>
				)}
				<form className="auth-form" onSubmit={onSubmit}>
					{mode === "register" && (
						<label htmlFor={`${fieldIds}-display-name`}>
							Display name
							<input
								id={`${fieldIds}-display-name`}
								name="display-name"
								placeholder="How should we call you?"
								required
							/>
						</label>
					)}
					<label htmlFor={`${fieldIds}-email`}>
						Email
						<input
							id={`${fieldIds}-email`}
							name="email"
							placeholder="you@example.com"
							required
							type="email"
						/>
					</label>
					<label htmlFor={`${fieldIds}-password`}>
						Password
						<input
							id={`${fieldIds}-password`}
							minLength={8}
							name="password"
							placeholder="At least 8 characters"
							required
							type="password"
						/>
					</label>
					{mode === "register" && (
						<p className="field-hint">Use at least 8 characters.</p>
					)}
					{status === "error" && (
						<div aria-live="assertive" className="form-alert">
							Invalid email or password.
						</div>
					)}
					{status === "expired" && (
						<div aria-live="polite" className="form-alert">
							Your session expired. Sign in again to continue.
						</div>
					)}
					<Button className="w-full" type="submit">
						{mode === "register" ? "Create account" : "Sign in"}
					</Button>
				</form>
			</DialogContent>
		</Dialog>
	);
}
