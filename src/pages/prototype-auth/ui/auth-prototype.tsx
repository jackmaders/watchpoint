import type { FormEvent, ReactNode } from "react";
import { useEffect, useId, useState } from "react";
import "./auth-prototype.css";

type Variant = "a" | "b" | "c";
type Mode = "sign-in" | "register";

const variants: { key: Variant; name: string; description: string }[] = [
	{
		description:
			"A focused single-column panel with the product story beside it.",
		key: "a",
		name: "Field briefing",
	},
	{
		description: "A cinematic training preview paired with the auth action.",
		key: "b",
		name: "Split-screen loadout",
	},
	{
		description:
			"A compact shell that keeps the public catalogue close at hand.",
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
	const [registrationEnabled, setRegistrationEnabled] = useState(true);
	const [status, setStatus] = useState("idle");
	const [destination, setDestination] = useState("King's Row / Session start");
	const fieldIds = useId();

	useEffect(() => {
		const onKeyDown = (event: KeyboardEvent) => {
			if (
				["INPUT", "TEXTAREA", "BUTTON"].includes(
					(event.target as HTMLElement).tagName,
				)
			)
				return;
			if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
				event.preventDefault();
				const index = variants.findIndex((item) => item.key === variant);
				const offset = event.key === "ArrowRight" ? 1 : -1;
				const next =
					variants[(index + offset + variants.length) % variants.length].key;
				selectVariant(next);
			}
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

	const current = variants.find((item) => item.key === variant) ?? variants[0];
	const form = (
		<form className="space-y-5" onSubmit={submit}>
			{mode === "register" && (
				<label className="block space-y-2" htmlFor={`${fieldIds}-display-name`}>
					<span className="text-sm font-semibold">Display name</span>
					<input
						id={`${fieldIds}-display-name`}
						name="display-name"
						placeholder="How should we call you?"
						required
					/>
					<span className="block text-xs text-muted-foreground">
						Use 2–32 characters. You can change this later.
					</span>
				</label>
			)}
			<label className="block space-y-2" htmlFor={`${fieldIds}-email`}>
				<span className="text-sm font-semibold">Email</span>
				<input
					id={`${fieldIds}-email`}
					name="email"
					placeholder="you@example.com"
					required
					type="email"
				/>
			</label>
			<label className="block space-y-2" htmlFor={`${fieldIds}-password`}>
				<span className="text-sm font-semibold">Password</span>
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
				<p className="text-xs text-muted-foreground">
					Use at least 8 characters.
				</p>
			)}
			{status === "error" && (
				<div
					aria-live="assertive"
					className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive"
				>
					Invalid email or password.
				</div>
			)}
			{status === "expired" && (
				<div
					aria-live="polite"
					className="rounded-md border border-primary/40 bg-primary/10 p-3 text-sm text-primary"
				>
					Your session expired. Sign in again to continue.
				</div>
			)}
			<button className="w-full" type="submit">
				{mode === "register" ? "Create account" : "Sign in"}
			</button>
			<p className="text-center text-sm text-muted-foreground">
				{mode === "register"
					? "Already have an account?"
					: "New to Watchpoint?"}{" "}
				<button
					className="link-button"
					onClick={() => {
						setMode(mode === "register" ? "sign-in" : "register");
						setStatus("idle");
					}}
					type="button"
				>
					{mode === "register"
						? "Sign in"
						: registrationEnabled
							? "Create an account"
							: "Registration is unavailable"}
				</button>
			</p>
		</form>
	);

	return (
		<main className={`prototype-shell variant-${variant}`}>
			<div aria-live="polite" className="prototype-state">
				<strong>Prototype state</strong>
				<span>
					variant={variant} · mode={mode} · registration=
					{registrationEnabled ? "on" : "off"} · status={status} · return=
					{destination}
				</span>
			</div>
			{variant === "a" && (
				<VariantA current={current} form={form} mode={mode} setMode={setMode} />
			)}
			{variant === "b" && (
				<VariantB current={current} form={form} mode={mode} setMode={setMode} />
			)}
			{variant === "c" && (
				<VariantC current={current} form={form} mode={mode} setMode={setMode} />
			)}
			<section aria-label="Prototype controls" className="prototype-controls">
				<button
					onClick={() => setRegistrationEnabled((value) => !value)}
					type="button"
				>
					Registration {registrationEnabled ? "enabled" : "disabled"}
				</button>
				<button onClick={() => setStatus("expired")} type="button">
					Simulate expiry
				</button>
				<button onClick={() => setStatus("error")} type="button">
					Simulate invalid credentials
				</button>
				<label>
					Return destination{" "}
					<input
						onChange={(event) => setDestination(event.target.value)}
						value={destination}
					/>
				</label>
			</section>
			<nav aria-label="Prototype variants" className="prototype-switcher">
				<button
					aria-label="Previous variant"
					onClick={() =>
						selectVariant(
							variants[
								(variants.findIndex((item) => item.key === variant) + 2) % 3
							].key,
						)
					}
					type="button"
				>
					←
				</button>
				<span>
					{current.key.toUpperCase()} — {current.name}
				</span>
				<button
					aria-label="Next variant"
					onClick={() =>
						selectVariant(
							variants[
								(variants.findIndex((item) => item.key === variant) + 1) % 3
							].key,
						)
					}
					type="button"
				>
					→
				</button>
			</nav>
		</main>
	);
}

function VariantA({
	current,
	form,
	mode,
	setMode,
}: {
	current: (typeof variants)[number];
	form: ReactNode;
	mode: Mode;
	setMode: (mode: Mode) => void;
}) {
	return (
		<div className="auth-layout auth-layout-a">
			<div className="auth-intro">
				<p className="eyebrow">Watchpoint / Field briefing</p>
				<h1>Train the read before the fight.</h1>
				<p>{current.description}</p>
				<div className="signal-list">
					<span>01 · Curated VOD moments</span>
					<span>02 · Immediate decision feedback</span>
					<span>03 · Your owned training history</span>
				</div>
			</div>
			<AuthPanel form={form} mode={mode} setMode={setMode} />
		</div>
	);
}

function VariantB({
	current,
	form,
	mode,
	setMode,
}: {
	current: (typeof variants)[number];
	form: ReactNode;
	mode: Mode;
	setMode: (mode: Mode) => void;
}) {
	return (
		<div className="auth-layout auth-layout-b">
			<div className="training-preview">
				<div className="preview-grid" />
				<p className="eyebrow">Live read / King's Row</p>
				<h1>Pause. Predict. Improve.</h1>
				<p>{current.description}</p>
				<span className="preview-time">00:43:18 · next scenario ahead</span>
			</div>
			<AuthPanel form={form} mode={mode} setMode={setMode} />
		</div>
	);
}

function VariantC({
	current,
	form,
	mode,
	setMode,
}: {
	current: (typeof variants)[number];
	form: ReactNode;
	mode: Mode;
	setMode: (mode: Mode) => void;
}) {
	return (
		<div className="auth-layout auth-layout-c">
			<aside className="command-rail">
				<span className="rail-mark">W</span>
				<p className="eyebrow">Watchpoint</p>
				<h1>Your next read is waiting.</h1>
				<p>{current.description}</p>
				<div className="rail-links">
					<span>VOD catalogue</span>
					<span>Training history</span>
					<span>Account</span>
				</div>
			</aside>
			<AuthPanel form={form} mode={mode} setMode={setMode} />
		</div>
	);
}

function AuthPanel({
	form,
	mode,
	setMode,
}: {
	form: ReactNode;
	mode: Mode;
	setMode: (mode: Mode) => void;
}) {
	const headingId = useId();
	return (
		<section aria-labelledby={headingId} className="auth-panel">
			<div className="auth-tabs" role="tablist">
				<button
					aria-selected={mode === "sign-in"}
					onClick={() => setMode("sign-in")}
					role="tab"
					type="button"
				>
					Sign in
				</button>
				<button
					aria-selected={mode === "register"}
					onClick={() => setMode("register")}
					role="tab"
					type="button"
				>
					Register
				</button>
			</div>
			<h2 id={headingId}>
				{mode === "register"
					? "Create your player identity"
					: "Welcome back, player"}
			</h2>
			<p className="panel-copy">
				{mode === "register"
					? "Own your attempts and pick up where your training left off."
					: "Continue to your next decision."}
			</p>
			{form}
		</section>
	);
}
