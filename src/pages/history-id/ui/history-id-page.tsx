/**
 * Detailed playthrough performance review page displaying overall metrics and scenario-by-scenario attempts.
 *
 * Implements `HistoryIdPage` along with loading skeletons, error boundaries, and empty state presentations
 * to render accuracy metrics, median active-response latency, and chronological scenario breakdowns.
 */
import { Link } from "@tanstack/react-router";
import type { PlayerHistoryItem } from "@/shared/db";
import { formatAccuracy, formatLatency } from "@/shared/lib/metrics";
import { formatDuration } from "@/shared/lib/utils";
import { Button } from "@/shared/ui/button";

export interface HistoryIdPageProps {
	error?: string | null;
	isLoading?: boolean;
	onRetry?: () => void;
	playthrough?: PlayerHistoryItem | null;
}

export function HistoryIdPage({
	error,
	isLoading,
	onRetry,
	playthrough,
}: HistoryIdPageProps) {
	if (error) {
		return <HistoryDetailErrorState error={error} onRetry={onRetry} />;
	}

	if (isLoading) {
		return <HistoryDetailLoadingSkeleton />;
	}

	if (!playthrough) {
		return <HistoryDetailNotFound />;
	}

	return (
		<main className="min-h-screen bg-background px-4 py-8 text-foreground sm:px-8 sm:py-12 lg:px-12">
			<div className="mx-auto max-w-4xl space-y-8">
				<div>
					<Link
						className="font-mono text-xs font-semibold uppercase tracking-[0.2em] text-primary hover:underline"
						to="/history"
					>
						&larr; Return to History
					</Link>
				</div>

				<HistoryDetailHeader playthrough={playthrough} />

				<section className="space-y-6">
					<h2 className="text-xl font-semibold text-foreground">
						Scenario Breakdown ({playthrough.scenarioSnapshots.length})
					</h2>

					<div className="space-y-4">
						{playthrough.scenarioSnapshots.map((snapshot, index) => {
							const attempt = playthrough.attempts.find(
								(a) =>
									a.scenarioSnapshotId === snapshot.id ||
									playthrough.attempts[index]?.id === a.id,
							);
							return (
								<ScenarioSnapshotCard
									attempt={attempt}
									index={index}
									key={snapshot.id}
									snapshot={snapshot}
								/>
							);
						})}
					</div>
				</section>
			</div>
		</main>
	);
}

function HistoryDetailHeader({
	playthrough,
}: {
	playthrough: PlayerHistoryItem;
}) {
	return (
		<header className="space-y-4 rounded-lg border border-border bg-card p-6 text-card-foreground shadow-sm">
			<div className="flex flex-wrap items-center gap-2">
				<span className="rounded-sm border border-secondary bg-secondary px-2 py-0.5 text-xs font-semibold text-secondary-foreground">
					{playthrough.vod?.mapName ?? "Unknown Map"}
				</span>
				<span className="rounded-sm border border-primary/40 bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
					{playthrough.vod?.rankTier ?? "Rank"}
				</span>
				{playthrough.status === "COMPLETED" ? (
					<span className="rounded-sm border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 text-xs font-semibold text-emerald-500">
						Completed
					</span>
				) : (
					<span className="rounded-sm border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-xs font-semibold text-amber-500">
						In Progress
					</span>
				)}
			</div>

			<h1 className="text-3xl font-bold tracking-tight text-foreground">
				{playthrough.vod?.title ?? "VOD Training Session"}
			</h1>

			<div className="grid grid-cols-2 gap-4 border-t border-border pt-4 sm:grid-cols-4 font-mono text-xs">
				<div>
					<span className="text-muted-foreground block">Completed</span>
					<strong className="text-foreground text-sm">
						{playthrough.completedAt
							? new Date(playthrough.completedAt).toLocaleDateString()
							: "In Progress"}
					</strong>
				</div>
				<div>
					<span className="text-muted-foreground block">Accuracy</span>
					<strong className="text-foreground text-sm">
						{formatAccuracy(playthrough.accuracy)}
					</strong>
				</div>
				<div>
					<span className="text-muted-foreground block">Median Latency</span>
					<strong className="text-foreground text-sm">
						{formatLatency(playthrough.medianLatencyMs)}
					</strong>
				</div>
				<div>
					<span className="text-muted-foreground block">Scenarios</span>
					<strong className="text-foreground text-sm">
						{playthrough.scenarioSnapshots.length}
					</strong>
				</div>
			</div>
		</header>
	);
}

interface ScenarioOption {
	id: string;
	isCorrect: boolean;
	label: string;
}

function ScenarioSnapshotCard({
	attempt,
	index,
	snapshot,
}: {
	attempt?: PlayerHistoryItem["attempts"][number];
	index: number;
	snapshot: PlayerHistoryItem["scenarioSnapshots"][number];
}) {
	const isCorrect = attempt?.isCorrect;
	const isTimedOut = attempt?.isTimedOut;
	const options = Array.isArray(snapshot.inputConfig?.options)
		? (snapshot.inputConfig.options as unknown as ScenarioOption[])
		: [];

	return (
		<div className="rounded-lg border border-border bg-card p-5 text-card-foreground shadow-sm space-y-4">
			<div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
				<div className="flex items-center gap-2">
					<span className="font-mono text-xs font-semibold text-primary">
						#{index + 1}
					</span>
					<span className="rounded border border-border bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground">
						{snapshot.moduleType}
					</span>
					<span className="font-mono text-xs text-muted-foreground">
						{formatDuration(snapshot.timestampSeconds)}
					</span>
				</div>

				<div className="flex items-center gap-2 font-mono text-xs">
					{attempt ? (
						<>
							{isTimedOut ? (
								<span className="rounded-sm border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-xs font-semibold text-amber-500">
									Timed Out
								</span>
							) : isCorrect ? (
								<span className="rounded-sm border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 text-xs font-semibold text-emerald-500">
									Correct
								</span>
							) : (
								<span className="rounded-sm border border-red-500/40 bg-red-500/10 px-2 py-0.5 text-xs font-semibold text-red-500">
									Incorrect
								</span>
							)}
							<span className="text-muted-foreground">
								{formatLatency(attempt.responseTimeMs)}
							</span>
						</>
					) : (
						<span className="text-muted-foreground">Unanswered</span>
					)}
				</div>
			</div>

			<div className="space-y-2">
				<h3 className="text-base font-medium text-foreground">
					{snapshot.promptText}
				</h3>
			</div>

			{options.length > 0 ? (
				<div className="space-y-2 pt-1">
					<span className="font-mono font-semibold uppercase tracking-wider text-muted-foreground text-[10px]">
						Answer Options
					</span>
					<div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
						{options.map((opt) => (
							<ScenarioOptionItem attempt={attempt} key={opt.id} option={opt} />
						))}
					</div>
				</div>
			) : null}

			<div className="rounded-md border border-border/80 bg-muted/40 p-3.5 text-xs space-y-1">
				<span className="font-mono font-semibold uppercase tracking-wider text-muted-foreground text-[10px]">
					Game Sense Explanation
				</span>
				<p className="text-foreground leading-relaxed">
					{snapshot.explanationText}
				</p>
			</div>
		</div>
	);
}

function ScenarioOptionItem({
	attempt,
	option,
}: {
	attempt?: PlayerHistoryItem["attempts"][number];
	option: ScenarioOption;
}) {
	const isSelected = attempt?.selectedOptionId === option.id;
	const isCorrectOpt = option.isCorrect;

	let style = "border-border bg-background text-muted-foreground";
	if (isSelected && isCorrectOpt) {
		style =
			"border-emerald-500/60 bg-emerald-500/10 text-foreground font-medium";
	} else if (isSelected && !isCorrectOpt) {
		style = "border-red-500/60 bg-red-500/10 text-foreground font-medium";
	} else if (isCorrectOpt) {
		style = "border-emerald-500/40 bg-emerald-500/5 text-foreground";
	}

	return (
		<div
			className={`flex items-center justify-between rounded-md border p-2.5 text-xs ${style}`}
		>
			<span>{option.label}</span>
			<div className="flex items-center gap-1.5 font-mono text-[10px]">
				{isSelected ? (
					<span className="rounded bg-primary/20 px-1.5 py-0.5 text-primary">
						Your Choice
					</span>
				) : null}
				{isCorrectOpt ? (
					<span className="rounded bg-emerald-500/20 px-1.5 py-0.5 text-emerald-500">
						Correct Answer
					</span>
				) : null}
			</div>
		</div>
	);
}

function HistoryDetailLoadingSkeleton() {
	return (
		<main className="min-h-screen bg-background px-4 py-8 text-foreground sm:px-8 sm:py-12 lg:px-12">
			<div
				aria-label="Loading session details"
				className="mx-auto max-w-4xl space-y-6"
				role="status"
			>
				<div className="h-6 w-32 animate-pulse rounded bg-muted/60" />
				<div className="h-32 w-full animate-pulse rounded-lg bg-card/60" />
				<div className="h-48 w-full animate-pulse rounded-lg bg-card/60" />
			</div>
		</main>
	);
}

function HistoryDetailNotFound() {
	return (
		<main className="min-h-screen bg-background px-4 py-8 text-foreground sm:px-8 sm:py-12 lg:px-12">
			<div className="mx-auto max-w-2xl space-y-6 text-center py-12">
				<div className="inline-flex rounded-sm border border-destructive/40 bg-destructive/10 px-3 py-1 font-mono text-xs font-semibold uppercase tracking-[0.14em] text-destructive">
					Not Found
				</div>
				<h1 className="text-3xl font-bold tracking-tight text-foreground">
					Training Session Not Found
				</h1>
				<p className="text-sm text-muted-foreground">
					The requested training session playthrough could not be found or
					belongs to another player.
				</p>
				<div>
					<Link
						className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90"
						to="/history"
					>
						Return to History &rarr;
					</Link>
				</div>
			</div>
		</main>
	);
}

function HistoryDetailErrorState({
	error,
	onRetry,
}: {
	error: string;
	onRetry?: () => void;
}) {
	return (
		<main className="min-h-screen bg-background px-4 py-8 text-foreground sm:px-8 sm:py-12 lg:px-12">
			<div className="mx-auto max-w-md rounded-lg border border-destructive/50 bg-destructive/10 p-6 text-center space-y-4">
				<p className="text-sm font-medium text-destructive">{error}</p>
				{onRetry ? (
					<Button onClick={onRetry} size="sm" variant="outline">
						Retry
					</Button>
				) : null}
			</div>
		</main>
	);
}
