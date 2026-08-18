"use client";

import { Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { ModuleType } from "@/shared/db";
import { Button } from "@/shared/ui/button";
import { buildSessionUrl } from "../model/module-filter";
import { MODULE_DEFINITIONS } from "../model/modules";

type PrototypeState = "ready" | "loading" | "empty" | "not-found" | "error";
type Variant = "A" | "B" | "C";

const MODULE_COUNTS: Record<ModuleType, number> = {
	COOLDOWN: 3,
	SPATIAL: 2,
	STRATEGY: 8,
	TACTICS: 5,
	ULTIMATE: 0,
};

const VARIANTS: Record<Variant, string> = {
	A: "Mission briefing",
	B: "Signal grid",
	C: "Compact dispatch",
};

const STATES: PrototypeState[] = [
	"ready",
	"loading",
	"empty",
	"not-found",
	"error",
];

function readSearchParam<T extends string>(
	key: string,
	fallback: T,
	values: readonly T[],
): T {
	if (typeof window === "undefined") return fallback;
	const value = new URLSearchParams(window.location.search).get(
		key,
	) as T | null;
	return value && values.includes(value) ? value : fallback;
}

function usePrototypeControls() {
	const [variant, setVariant] = useState<Variant>(() =>
		readSearchParam("variant", "A", ["A", "B", "C"] as const),
	);
	const [state, setState] = useState<PrototypeState>(() =>
		readSearchParam("state", "ready", STATES),
	);

	const updateSearch = useCallback(
		(nextVariant: Variant, nextState: PrototypeState) => {
			setVariant(nextVariant);
			setState(nextState);
			const params = new URLSearchParams(window.location.search);
			params.set("variant", nextVariant);
			params.set("state", nextState);
			window.history.replaceState(
				{},
				"",
				`${window.location.pathname}?${params}`,
			);
		},
		[],
	);

	useEffect(() => {
		const handleKeyDown = (event: KeyboardEvent) => {
			const target = event.target as HTMLElement | null;
			if (
				target?.matches("input, textarea, [contenteditable='true']") ||
				!event.key.match(/^Arrow(Left|Right)$/)
			)
				return;

			event.preventDefault();
			const index = ["A", "B", "C"].indexOf(variant);
			const nextIndex =
				event.key === "ArrowRight" ? (index + 1) % 3 : (index + 2) % 3;
			updateSearch(["A", "B", "C"][nextIndex] as Variant, state);
		};

		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [state, updateSearch, variant]);

	return { state, updateSearch, variant };
}

function StateMessage({ state }: { state: PrototypeState }) {
	const messages: Partial<Record<PrototypeState, [string, string]>> = {
		error: [
			"Service unavailable",
			"We couldn't load the scenario catalogue. Try again when the service is back.",
		],
		"not-found": [
			"VOD unavailable",
			"This training session is unpublished or no longer available.",
		],
	};
	const copy = messages[state];

	if (!copy) return null;

	return (
		<div className="rounded-lg border border-destructive/40 bg-destructive/10 p-6 text-center">
			<p className="text-sm font-semibold text-destructive">{copy[0]}</p>
			<p className="mt-2 text-sm text-muted-foreground">{copy[1]}</p>
		</div>
	);
}

function ModuleToggle({
	active,
	count,
	module,
	onToggle,
}: {
	active: boolean;
	count: number;
	module: (typeof MODULE_DEFINITIONS)[number];
	onToggle: () => void;
}) {
	return (
		<button
			aria-pressed={active}
			className={`w-full text-left transition-colors ${active ? "border-primary bg-primary/10" : "border-border bg-card hover:bg-accent"} rounded-md border p-4`}
			onClick={onToggle}
			type="button"
		>
			<div className="flex items-start justify-between gap-4">
				<div>
					<p className="text-sm font-semibold text-card-foreground">
						{module.label}
					</p>
					<p className="mt-1 text-xs leading-5 text-muted-foreground">
						{module.description}
					</p>
				</div>
				<span
					className={`shrink-0 text-xs font-semibold ${active ? "text-primary" : "text-muted-foreground"}`}
				>
					{active ? "ON" : "OFF"}
				</span>
			</div>
			<p className="mt-3 text-xs text-muted-foreground">
				{count} scenario{count === 1 ? "" : "s"}
			</p>
		</button>
	);
}

function PrototypeShell({
	children,
	state,
	updateSearch,
	variant,
}: {
	children: React.ReactNode;
	state: PrototypeState;
	updateSearch: (variant: Variant, state: PrototypeState) => void;
	variant: Variant;
}) {
	const moveVariant = useCallback(
		(direction: "next" | "previous") => {
			const index = ["A", "B", "C"].indexOf(variant);
			const nextIndex =
				direction === "next" ? (index + 1) % 3 : (index + 2) % 3;
			updateSearch(["A", "B", "C"][nextIndex] as Variant, state);
		},
		[state, updateSearch, variant],
	);

	return (
		<main className="min-h-screen bg-background px-4 py-8 text-foreground sm:px-8">
			<div className="mx-auto max-w-6xl">{children}</div>
			<div className="fixed bottom-4 left-1/2 z-10 flex -translate-x-1/2 items-center gap-3 rounded-full border border-foreground/20 bg-foreground px-3 py-2 text-background shadow-2xl">
				<VariantArrow direction="previous" moveVariant={moveVariant} />
				<span className="min-w-36 text-center text-xs font-semibold">
					{variant} — {VARIANTS[variant]}
				</span>
				<VariantArrow direction="next" moveVariant={moveVariant} />
			</div>
		</main>
	);
}

function VariantArrow({
	direction,
	moveVariant,
}: {
	direction: "next" | "previous";
	moveVariant: (direction: "next" | "previous") => void;
}) {
	const handleClick = useCallback(
		() => moveVariant(direction),
		[direction, moveVariant],
	);
	return (
		<button
			aria-label={`${direction === "next" ? "Next" : "Previous"} prototype variant`}
			className="rounded-full px-2 text-lg hover:bg-background/20"
			onClick={handleClick}
			type="button"
		>
			{direction === "next" ? "→" : "←"}
		</button>
	);
}

function ModuleSelection({
	activeModules,
	onToggle,
}: {
	activeModules: ModuleType[];
	onToggle: (module: ModuleType) => void;
}) {
	const handleToggle = useCallback(
		(module: ModuleType) => () => onToggle(module),
		[onToggle],
	);

	return (
		<div className="grid gap-3 sm:grid-cols-2">
			{MODULE_DEFINITIONS.map((module) => (
				<ModuleToggle
					active={activeModules.includes(module.key)}
					count={MODULE_COUNTS[module.key]}
					key={module.key}
					module={module}
					onToggle={handleToggle(module.key)}
				/>
			))}
		</div>
	);
}

function ModuleChip({
	active,
	label,
	count,
	module,
	onToggle,
}: {
	active: boolean;
	label: string;
	count: number;
	module: ModuleType;
	onToggle: (module: ModuleType) => void;
}) {
	const handleToggle = useCallback(() => onToggle(module), [module, onToggle]);

	return (
		<button
			aria-pressed={active}
			className={`rounded-full border px-3 py-2 text-xs font-semibold ${active ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground hover:bg-accent"}`}
			onClick={handleToggle}
			type="button"
		>
			{label} · {count}
		</button>
	);
}

export function VodModuleFilterPrototype() {
	// Three variants of the Pre-Session Module Filter, switchable via ?variant= on a throwaway route.
	const { state, updateSearch, variant } = usePrototypeControls();
	const [activeModules, setActiveModules] = useState<ModuleType[]>(() =>
		MODULE_DEFINITIONS.map((module) => module.key),
	);
	const scenarioCount =
		state === "empty"
			? 0
			: activeModules.reduce(
					(total, module) => total + MODULE_COUNTS[module],
					0,
				);
	const startHref = useMemo(
		() => buildSessionUrl("prototype-vod", activeModules),
		[activeModules],
	);
	const toggle = useCallback(
		(module: ModuleType) =>
			setActiveModules((current) =>
				current.includes(module)
					? current.filter((item) => item !== module)
					: [...current, module],
			),
		[],
	);
	const actions = (
		<div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-5">
			<span className="text-xs text-muted-foreground">
				{activeModules.length} modules selected · {scenarioCount} scenarios in
				scope
			</span>
			<Button asChild disabled={scenarioCount === 0} size="lg">
				<Link href={startHref} to={startHref}>
					Start training →
				</Link>
			</Button>
		</div>
	);

	if (state === "loading") {
		return (
			<PrototypeShell
				state={state}
				updateSearch={updateSearch}
				variant={variant}
			>
				<div className="space-y-8">
					<p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
						Pre-session / prototype
					</p>
					<div className="h-10 w-2/3 animate-pulse rounded bg-muted" />
					<div className="h-5 w-1/2 animate-pulse rounded bg-muted" />
					<div className="grid gap-3 sm:grid-cols-2">
						<div className="h-32 animate-pulse rounded-md bg-muted" />
						<div className="h-32 animate-pulse rounded-md bg-muted" />
						<div className="h-32 animate-pulse rounded-md bg-muted" />
					</div>
				</div>
			</PrototypeShell>
		);
	}

	return (
		<PrototypeShell state={state} updateSearch={updateSearch} variant={variant}>
			<div className="space-y-8 pb-20">
				<Link
					className="text-sm text-muted-foreground hover:text-foreground"
					to="/vods"
				>
					← Back to VOD catalogue
				</Link>
				<header className="space-y-3 border-b border-border pb-6">
					<p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
						Pre-session / prototype
					</p>
					<h1 className="max-w-3xl text-3xl font-semibold tracking-tight sm:text-5xl">
						Choose what to practice from{" "}
						<span className="text-primary">King's Row — Overtime</span>
					</h1>
					<p className="max-w-2xl text-sm leading-6 text-muted-foreground">
						A focused warm-up before you enter the VOD. Select the situations
						you want to see, then launch a session with that scope.
					</p>
				</header>
				<StateMessage state={state} />
				{state === "empty" && (
					<div className="rounded-md border border-border bg-muted/50 p-5 text-sm text-muted-foreground">
						No scenarios are currently available for this VOD. Your module
						choices remain visible, but there is nothing to launch.
					</div>
				)}
				{variant === "A" && (
					<section className="space-y-5 rounded-lg border border-border bg-card p-5 sm:p-7">
						<div className="flex flex-wrap items-end justify-between gap-4">
							<div>
								<h2 className="text-xl font-semibold text-card-foreground">
									Mission briefing
								</h2>
								<p className="mt-1 text-sm text-muted-foreground">
									Select the situations you want in this run.
								</p>
							</div>
							<span className="text-right text-3xl font-semibold text-primary">
								{scenarioCount}
								<span className="ml-2 text-xs font-normal text-muted-foreground">
									scenarios
								</span>
							</span>
						</div>
						<ModuleSelection activeModules={activeModules} onToggle={toggle} />
						{actions}
					</section>
				)}
				{variant === "B" && (
					<section className="grid gap-5 lg:grid-cols-[1fr_18rem]">
						<div className="rounded-lg border border-border bg-card p-5 sm:p-7">
							<div className="mb-6 flex items-center justify-between">
								<div>
									<h2 className="text-xl font-semibold text-card-foreground">
										Signal grid
									</h2>
									<p className="mt-1 text-sm text-muted-foreground">
										Turn training signals on or off.
									</p>
								</div>
								<span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
									{activeModules.length}/5 active
								</span>
							</div>
							<div className="grid gap-3 sm:grid-cols-2">
								<ModuleSelection
									activeModules={activeModules}
									onToggle={toggle}
								/>
							</div>
						</div>
						<aside className="h-fit rounded-lg border border-border bg-muted/50 p-5">
							<p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
								Run preview
							</p>
							<p className="mt-4 text-4xl font-semibold text-foreground">
								{scenarioCount}
							</p>
							<p className="text-sm text-muted-foreground">
								scenarios will appear
							</p>
							<div className="my-6 space-y-3 text-xs text-muted-foreground">
								<p>✓ Read-only practice run</p>
								<p>✓ Module choices stay in the URL</p>
								<p>✓ Start with any non-empty selection</p>
							</div>
							{actions}
						</aside>
					</section>
				)}
				{variant === "C" && (
					<section className="rounded-lg border border-border bg-card p-5 sm:p-7">
						<div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
							<div className="max-w-md">
								<h2 className="text-xl font-semibold text-card-foreground">
									Compact dispatch
								</h2>
								<p className="mt-1 text-sm text-muted-foreground">
									Build a focused session in under a minute.
								</p>
								<div className="mt-5 flex flex-wrap gap-2">
									{MODULE_DEFINITIONS.map((module) => (
										<ModuleChip
											active={activeModules.includes(module.key)}
											count={MODULE_COUNTS[module.key]}
											key={module.key}
											label={module.label}
											module={module.key}
											onToggle={toggle}
										/>
									))}
								</div>
							</div>
							<div className="w-full max-w-xs rounded-md border border-border p-4">
								<p className="text-xs uppercase tracking-widest text-muted-foreground">
									Ready check
								</p>
								<p className="mt-2 text-2xl font-semibold text-foreground">
									{scenarioCount} scenarios
								</p>
								<p className="mt-1 text-xs text-muted-foreground">
									{scenarioCount === 0
										? "Choose at least one available module."
										: "Your practice route is ready."}
								</p>
								<div className="mt-4">{actions}</div>
							</div>
						</div>
					</section>
				)}
			</div>
		</PrototypeShell>
	);
}
