"use client";

import {
	type MouseEvent,
	type ReactNode,
	useCallback,
	useEffect,
	useId,
	useState,
} from "react";

export type MediaRecoveryPrototypeVariant = "A" | "B" | "C";
type RecoveryState = "buffering" | "stalled" | "failed" | "recovered";

const variants: Record<MediaRecoveryPrototypeVariant, string> = {
	A: "Quiet overlay",
	B: "Status rail",
	C: "Recovery dock",
};

const stateLabels: Record<RecoveryState, string> = {
	buffering: "Buffering",
	failed: "Playback failed",
	recovered: "Recovered",
	stalled: "Taking longer",
};

interface PrototypeProps {
	variant: MediaRecoveryPrototypeVariant;
	onExit: () => void;
	onVariantChange: (variant: MediaRecoveryPrototypeVariant) => void;
}

type RecoveryMessageProps = {
	onEscalate: () => void;
	state: RecoveryState;
	onRetry: () => void;
	onRestart: () => void;
};

function getPrototypeKeyDirection(key: string) {
	if (key === "ArrowRight") return 1;
	if (key === "ArrowLeft") return -1;
	return 0;
}

function StateHarness({
	state,
	onStateChange,
}: {
	state: RecoveryState;
	onStateChange: (state: RecoveryState) => void;
}) {
	const selectState = useCallback(
		(event: MouseEvent<HTMLButtonElement>) => {
			onStateChange(event.currentTarget.dataset.state as RecoveryState);
		},
		[onStateChange],
	);

	return (
		<div className="flex flex-wrap items-center gap-2 border-b border-border/70 pb-3 text-xs">
			<span className="mr-1 font-semibold text-muted-foreground">
				Preview state
			</span>
			{(Object.keys(stateLabels) as RecoveryState[]).map((key) => (
				<button
					aria-pressed={state === key}
					className={`rounded-full border px-3 py-1.5 font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${state === key ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-muted-foreground hover:text-foreground"}`}
					data-state={key}
					key={key}
					onClick={selectState}
					type="button"
				>
					{stateLabels[key]}
				</button>
			))}
		</div>
	);
}

function RecoveryMessage({
	state,
	onEscalate,
	onRetry,
	onRestart,
}: RecoveryMessageProps) {
	if (state === "buffering") {
		return (
			<div className="flex items-center gap-3 rounded-lg bg-background/85 px-4 py-3 shadow-lg backdrop-blur">
				<span
					aria-hidden="true"
					className="h-3 w-3 animate-pulse rounded-full bg-primary"
				/>
				<p className="text-sm font-semibold">Finding the next moment…</p>
				<button
					className="rounded-md border border-border px-2 py-1 text-xs font-semibold hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
					onClick={onEscalate}
					type="button"
				>
					Simulate prolonged stall
				</button>
			</div>
		);
	}

	if (state === "stalled") {
		return (
			<div className="max-w-sm rounded-xl border border-primary/50 bg-background/95 p-5 shadow-xl">
				<p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">
					Still working
				</p>
				<h2 className="mt-2 text-lg font-bold">
					This is taking longer than usual
				</h2>
				<p className="mt-2 text-sm text-muted-foreground">
					Your answers are safe. We’ll keep trying without blocking the rest of
					the session.
				</p>
				<button
					className="mt-4 rounded-md border border-border px-3 py-2 text-xs font-bold hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
					onClick={onRestart}
					type="button"
				>
					Restart session
				</button>
			</div>
		);
	}

	if (state === "failed") {
		return (
			<div
				aria-label="Media playback failed"
				className="max-w-sm rounded-xl border border-destructive/60 bg-background/95 p-5 shadow-xl"
				role="alert"
			>
				<p className="text-xs font-bold uppercase tracking-[0.18em] text-destructive">
					Playback unavailable
				</p>
				<h2 className="mt-2 text-lg font-bold">We couldn’t load this moment</h2>
				<p className="mt-2 text-sm text-muted-foreground">
					Try the connection again, or restart the session from the beginning.
				</p>
				<div className="mt-4 flex flex-wrap gap-2">
					<button
						className="rounded-md bg-primary px-3 py-2 text-xs font-bold text-primary-foreground hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
						onClick={onRetry}
						type="button"
					>
						Try again
					</button>
					<button
						className="rounded-md border border-border px-3 py-2 text-xs font-bold hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
						onClick={onRestart}
						type="button"
					>
						Restart session
					</button>
				</div>
			</div>
		);
	}

	return (
		<p className="rounded-full bg-emerald-400/15 px-4 py-2 text-sm font-bold text-emerald-300">
			Playback resumed · your place is saved
		</p>
	);
}

function PrototypeSwitcher({
	variant,
	onChange,
}: {
	variant: MediaRecoveryPrototypeVariant;
	onChange: PrototypeProps["onVariantChange"];
}) {
	const keys = Object.keys(variants) as MediaRecoveryPrototypeVariant[];
	const move = useCallback(
		(direction: number) => {
			const index = keys.indexOf(variant);
			onChange(keys[(index + direction + keys.length) % keys.length]);
		},
		[onChange, variant, keys],
	);
	const previous = useCallback(() => move(-1), [move]);
	const next = useCallback(() => move(1), [move]);

	useEffect(() => {
		const handleKeyDown = (event: KeyboardEvent) => {
			const target = event.target as HTMLElement | null;
			const direction = getPrototypeKeyDirection(event.key);
			if (
				target?.matches("input, textarea, [contenteditable='true']") ||
				direction === 0
			)
				return;
			event.preventDefault();
			move(direction);
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [move]);

	return (
		<nav
			aria-label="Prototype variations"
			className="fixed inset-x-3 bottom-3 z-50 mx-auto flex max-w-sm items-center justify-between rounded-full border border-primary/40 bg-background/95 px-2 py-2 text-xs shadow-2xl backdrop-blur sm:inset-x-auto sm:bottom-5"
		>
			<button
				aria-label="Previous prototype variation"
				className="rounded-full px-3 py-2 text-lg hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
				onClick={previous}
				type="button"
			>
				←
			</button>
			<span className="text-center">
				<span className="font-bold text-primary">{variant}</span>
				<span className="mx-1 text-muted-foreground">·</span>
				{variants[variant]}
			</span>
			<button
				aria-label="Next prototype variation"
				className="rounded-full px-3 py-2 text-lg hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
				onClick={next}
				type="button"
			>
				→
			</button>
		</nav>
	);
}

export function SessionPlayerMediaRecoveryPrototype({
	variant,
	onVariantChange,
	onExit,
}: PrototypeProps) {
	const [state, setState] = useState<RecoveryState>("buffering");
	const titleId = useId();
	const announce =
		state === "failed"
			? "Playback failed. Recovery actions are available."
			: `Media status: ${stateLabels[state]}.`;
	const retry = useCallback(() => setState("recovered"), []);
	const restart = useCallback(() => setState("buffering"), []);
	const escalate = useCallback(() => setState("stalled"), []);

	return (
		<section aria-labelledby={titleId} className="space-y-4">
			<div className="flex flex-wrap items-start justify-between gap-3">
				<div>
					<p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">
						Prototype · read-only
					</p>
					<h1 className="mt-1 text-2xl font-extrabold" id={titleId}>
						Media recovery states
					</h1>
					<p className="mt-1 text-sm text-muted-foreground">
						Explore how buffering earns attention without taking control away.
					</p>
				</div>
				<button
					className="rounded-md border border-border px-3 py-2 text-xs font-bold hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
					onClick={onExit}
					type="button"
				>
					Exit prototype
				</button>
			</div>
			<StateHarness onStateChange={setState} state={state} />
			<div
				aria-atomic="true"
				aria-live={state === "failed" ? "assertive" : "polite"}
				className="sr-only"
			>
				{announce}
			</div>

			{variant === "A" ? (
				<VariantA
					onEscalate={escalate}
					onRestart={restart}
					onRetry={retry}
					state={state}
				/>
			) : null}
			{variant === "B" ? (
				<VariantB
					onEscalate={escalate}
					onRestart={restart}
					onRetry={retry}
					state={state}
				/>
			) : null}
			{variant === "C" ? (
				<VariantC
					onEscalate={escalate}
					onRestart={restart}
					onRetry={retry}
					state={state}
				/>
			) : null}
			<PrototypeSwitcher onChange={onVariantChange} variant={variant} />
		</section>
	);
}

function FakeViewport({
	children,
	className = "",
}: {
	children: ReactNode;
	className?: string;
}) {
	return (
		<div
			className={`relative aspect-video overflow-hidden rounded-xl border border-border bg-[#161413] shadow-lg ${className}`}
		>
			<div
				className="absolute inset-0 opacity-70"
				style={{
					background:
						"radial-gradient(circle at 62% 34%, #6c462d 0, transparent 30%), linear-gradient(135deg, #252522, #3b2b29 48%, #171719)",
				}}
			/>
			<div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/70 to-transparent" />
			{children}
		</div>
	);
}

function VariantA({
	state,
	onEscalate,
	onRetry,
	onRestart,
}: RecoveryMessageProps) {
	return (
		<FakeViewport>
			<div className="absolute inset-0 flex items-center justify-center p-4">
				<RecoveryMessage
					onEscalate={onEscalate}
					onRestart={onRestart}
					onRetry={onRetry}
					state={state}
				/>
			</div>
			<div className="absolute inset-x-4 bottom-4 flex justify-between text-xs text-white/70">
				<span>01:42 / 08:30</span>
				<span>Scenario 2 of 5</span>
			</div>
		</FakeViewport>
	);
}

function VariantB({
	state,
	onEscalate,
	onRetry,
	onRestart,
}: RecoveryMessageProps) {
	return (
		<div className="grid overflow-hidden rounded-xl border border-border bg-card shadow-lg md:grid-cols-[1fr_13rem]">
			<FakeViewport className="rounded-none border-0 shadow-none">
				<div className="absolute left-4 top-4 rounded-full bg-black/55 px-3 py-1 text-xs font-bold text-white">
					LIVE SESSION
				</div>
			</FakeViewport>
			<aside className="flex flex-col justify-between border-t border-border p-4 md:border-l md:border-t-0">
				<div>
					<p className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">
						Connection
					</p>
					<p className="mt-2 text-lg font-bold">{stateLabels[state]}</p>
					<div className="mt-4 h-1.5 rounded-full bg-muted">
						<div
							className={`h-full rounded-full ${state === "failed" ? "w-1/4 bg-destructive" : state === "stalled" ? "w-2/3 bg-primary" : "w-full bg-emerald-400"}`}
						/>
					</div>
					<p className="mt-2 text-xs text-muted-foreground">
						The session stays available while media recovers.
					</p>
				</div>
				<RecoveryMessage
					onEscalate={onEscalate}
					onRestart={onRestart}
					onRetry={onRetry}
					state={state}
				/>
			</aside>
		</div>
	);
}

function VariantC({
	state,
	onEscalate,
	onRetry,
	onRestart,
}: RecoveryMessageProps) {
	return (
		<FakeViewport>
			<div className="absolute inset-x-3 bottom-3 rounded-lg border border-white/15 bg-black/75 p-3 text-white backdrop-blur sm:inset-x-5 sm:bottom-5 sm:p-4">
				<div className="flex flex-wrap items-center justify-between gap-3">
					<div>
						<p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">
							Session paused
						</p>
						<p className="mt-1 text-sm font-semibold">
							{state === "buffering"
								? "Loading the next moment…"
								: stateLabels[state]}
						</p>
					</div>
					<RecoveryMessage
						onEscalate={onEscalate}
						onRestart={onRestart}
						onRetry={onRetry}
						state={state}
					/>
				</div>
			</div>
		</FakeViewport>
	);
}
