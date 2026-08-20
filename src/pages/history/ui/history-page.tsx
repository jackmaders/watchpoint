import { Link } from "@tanstack/react-router";
import type { ChangeEvent } from "react";
import { useCallback } from "react";
import type {
	ModuleType,
	PlayerHistoryItem,
	PlayerHistoryResult,
	PlaythroughStatus,
	PublishedVodItem,
} from "@/shared/db";
import { formatAccuracy, formatLatency } from "@/shared/lib/metrics";
import { AccountControls } from "@/shared/ui/auth-modal";
import { Button } from "@/shared/ui/button";

const MODULE_LABEL_MAP: Record<ModuleType, string> = {
	COOLDOWN: "Cooldown",
	SPATIAL: "Spatial",
	STRATEGY: "Strategy",
	TACTICS: "Tactics",
	ULTIMATE: "Ultimate",
};

const ALL_MODULES: { key: ModuleType; label: string }[] = [
	{ key: "STRATEGY", label: MODULE_LABEL_MAP.STRATEGY },
	{ key: "TACTICS", label: MODULE_LABEL_MAP.TACTICS },
	{ key: "ULTIMATE", label: MODULE_LABEL_MAP.ULTIMATE },
	{ key: "COOLDOWN", label: MODULE_LABEL_MAP.COOLDOWN },
	{ key: "SPATIAL", label: MODULE_LABEL_MAP.SPATIAL },
];

import type { HistorySearchParams } from "../model/search-params";

export interface HistoryPageProps {
	data?: PlayerHistoryResult;
	error?: string | null;
	isLoading?: boolean;
	onFilterChange?: (newParams: HistorySearchParams) => void;
	onRetry?: () => void;
	registrationEnabled?: boolean;
	searchParams?: HistorySearchParams;
	vods?: PublishedVodItem[];
}

export function HistoryPage(props: HistoryPageProps) {
	return (
		<main className="min-h-screen bg-background px-4 py-8 text-foreground sm:px-8 sm:py-12 lg:px-12">
			<div className="mx-auto max-w-6xl space-y-8">
				<HistoryTopNav
					registrationEnabled={props.registrationEnabled ?? true}
				/>
				<HistoryHeader />
				<HistoryMainContent {...props} />
			</div>
		</main>
	);
}

function HistoryMainContent(props: HistoryPageProps) {
	if (props.error) {
		return <HistoryErrorState error={props.error} onRetry={props.onRetry} />;
	}
	if (props.isLoading) {
		return <HistoryLoadingSkeleton />;
	}
	return <HistoryFilteredList {...props} />;
}

function HistoryFilteredList({
	data,
	onFilterChange,
	searchParams = {},
	vods = [],
}: HistoryPageProps) {
	const currentStatus = searchParams.status ?? "COMPLETED";

	const handleStatusChange = useCallback(
		(status: PlaythroughStatus) => {
			onFilterChange?.({
				...searchParams,
				page: 1,
				status,
			});
		},
		[onFilterChange, searchParams],
	);

	const handleVodChange = useCallback(
		(vodId: string) => {
			onFilterChange?.({
				...searchParams,
				page: 1,
				vodId: vodId || undefined,
			});
		},
		[onFilterChange, searchParams],
	);

	const handleModuleToggle = useCallback(
		(moduleKey: ModuleType) => {
			const selectedModules = searchParams.modules ?? [];
			const isSelected = selectedModules.includes(moduleKey);
			const newModules = isSelected
				? selectedModules.filter((m) => m !== moduleKey)
				: [...selectedModules, moduleKey];

			onFilterChange?.({
				...searchParams,
				modules: newModules.length > 0 ? newModules : undefined,
				page: 1,
			});
		},
		[onFilterChange, searchParams],
	);

	const handlePageChange = useCallback(
		(page: number) => {
			onFilterChange?.({
				...searchParams,
				page,
			});
		},
		[onFilterChange, searchParams],
	);

	return (
		<div className="space-y-6">
			<HistoryFilterBar
				currentStatus={currentStatus}
				onModuleToggle={handleModuleToggle}
				onStatusChange={handleStatusChange}
				onVodChange={handleVodChange}
				selectedModules={searchParams.modules ?? []}
				selectedVodId={searchParams.vodId ?? ""}
				vods={vods}
			/>

			{data && data.items.length > 0 ? (
				<div className="space-y-4">
					{data.items.map((item) => (
						<HistoryItemCard item={item} key={item.id} />
					))}
					{data.totalPages > 1 ? (
						<HistoryPaginationBar data={data} onPageChange={handlePageChange} />
					) : null}
				</div>
			) : (
				<HistoryEmptyState currentStatus={currentStatus} />
			)}
		</div>
	);
}

function HistoryTopNav({
	registrationEnabled,
}: {
	registrationEnabled: boolean;
}) {
	return (
		<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
			<div className="flex items-center gap-4">
				<Link
					className="font-mono text-xs font-semibold uppercase tracking-[0.2em] text-primary hover:underline"
					to="/"
				>
					&larr; Watchpoint Home
				</Link>
				<Link
					className="font-mono text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground hover:underline"
					to="/vods"
				>
					VOD Catalog
				</Link>
			</div>
			<AccountControls registrationEnabled={registrationEnabled} />
		</div>
	);
}

function HistoryHeader() {
	return (
		<header className="space-y-3 border-b border-border pb-6">
			<div className="inline-flex rounded-sm border border-primary/40 bg-primary/10 px-3 py-1 font-mono text-xs font-semibold uppercase tracking-[0.14em] text-primary">
				Performance History
			</div>
			<h1 className="text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
				Training History
			</h1>
			<p className="max-w-2xl text-base text-muted-foreground">
				Review your past interactive training playthroughs, accuracy, and median
				response latencies across completed scenarios.
			</p>
		</header>
	);
}

function HistoryLoadingSkeleton() {
	return (
		<div
			aria-label="Loading training history"
			className="space-y-4"
			role="status"
		>
			<div className="h-12 w-full animate-pulse rounded-md bg-muted/60" />
			<div className="h-28 w-full animate-pulse rounded-lg bg-card/60" />
			<div className="h-28 w-full animate-pulse rounded-lg bg-card/60" />
			<div className="h-28 w-full animate-pulse rounded-lg bg-card/60" />
		</div>
	);
}

function HistoryErrorState({
	error,
	onRetry,
}: {
	error: string;
	onRetry?: () => void;
}) {
	return (
		<div className="rounded-lg border border-destructive/50 bg-destructive/10 p-6 text-center space-y-4">
			<p className="text-sm font-medium text-destructive">{error}</p>
			{onRetry ? (
				<Button onClick={onRetry} size="sm" variant="outline">
					Retry
				</Button>
			) : null}
		</div>
	);
}

interface HistoryFilterBarProps {
	currentStatus: PlaythroughStatus;
	onModuleToggle: (module: ModuleType) => void;
	onStatusChange: (status: PlaythroughStatus) => void;
	onVodChange: (vodId: string) => void;
	selectedModules: readonly ModuleType[];
	selectedVodId: string;
	vods: readonly PublishedVodItem[];
}

function HistoryFilterBar({
	currentStatus,
	onModuleToggle,
	onStatusChange,
	onVodChange,
	selectedModules,
	selectedVodId,
	vods,
}: HistoryFilterBarProps) {
	const handleCompleted = useCallback(
		() => onStatusChange("COMPLETED"),
		[onStatusChange],
	);
	const handleInProgress = useCallback(
		() => onStatusChange("IN_PROGRESS"),
		[onStatusChange],
	);
	const handleSelectChange = useCallback(
		(e: ChangeEvent<HTMLSelectElement>) => onVodChange(e.target.value),
		[onVodChange],
	);

	return (
		<div className="flex flex-col gap-4 rounded-lg border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
			<div
				aria-label="Playthrough status"
				className="flex items-center gap-1 rounded-md border border-border bg-muted/50 p-1"
				role="tablist"
			>
				<button
					aria-selected={currentStatus === "COMPLETED"}
					className={`rounded px-3 py-1.5 text-xs font-semibold transition-colors ${
						currentStatus === "COMPLETED"
							? "bg-background text-foreground shadow-sm"
							: "text-muted-foreground hover:text-foreground"
					}`}
					onClick={handleCompleted}
					role="tab"
					type="button"
				>
					Completed
				</button>
				<button
					aria-selected={currentStatus === "IN_PROGRESS"}
					className={`rounded px-3 py-1.5 text-xs font-semibold transition-colors ${
						currentStatus === "IN_PROGRESS"
							? "bg-background text-foreground shadow-sm"
							: "text-muted-foreground hover:text-foreground"
					}`}
					onClick={handleInProgress}
					role="tab"
					type="button"
				>
					In Progress
				</button>
			</div>

			<div className="flex flex-wrap items-center gap-3">
				<select
					aria-label="Filter by VOD"
					className="h-9 rounded-md border border-input bg-background px-3 py-1 text-xs text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
					onChange={handleSelectChange}
					value={selectedVodId}
				>
					<option value="">All VODs</option>
					{vods.map((vod) => (
						<option key={vod.id} value={vod.id}>
							{vod.title} ({vod.mapName})
						</option>
					))}
				</select>

				<div className="flex flex-wrap items-center gap-1.5">
					{ALL_MODULES.map((m) => (
						<ModuleFilterButton
							active={selectedModules.includes(m.key)}
							definition={m}
							key={m.key}
							onToggle={onModuleToggle}
						/>
					))}
				</div>
			</div>
		</div>
	);
}

function ModuleFilterButton({
	active,
	definition,
	onToggle,
}: {
	active: boolean;
	definition: { key: ModuleType; label: string };
	onToggle: (key: ModuleType) => void;
}) {
	const handleClick = useCallback(
		() => onToggle(definition.key),
		[definition.key, onToggle],
	);

	return (
		<button
			aria-label={`Toggle ${definition.label}`}
			className={`rounded border px-2.5 py-1 text-xs font-medium transition-colors ${
				active
					? "border-primary bg-primary text-primary-foreground"
					: "border-border bg-background text-muted-foreground hover:border-foreground/30 hover:text-foreground"
			}`}
			onClick={handleClick}
			type="button"
		>
			{definition.label}
		</button>
	);
}

function HistoryItemCard({ item }: { item: PlayerHistoryItem }) {
	return (
		<div className="flex flex-col justify-between gap-4 rounded-lg border border-border bg-card p-5 text-card-foreground shadow-sm transition-[border-color,box-shadow] duration-200 hover:border-primary/50 sm:flex-row sm:items-center">
			<div className="space-y-2">
				<div className="flex flex-wrap items-center gap-2">
					<span className="rounded-sm border border-secondary bg-secondary px-2 py-0.5 text-xs font-semibold text-secondary-foreground">
						{item.vod?.mapName ?? "Unknown Map"}
					</span>
					<span className="rounded-sm border border-primary/40 bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
						{item.vod?.rankTier ?? "Rank"}
					</span>
					{item.status === "IN_PROGRESS" ? (
						<span className="rounded-sm border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-xs font-semibold text-amber-500">
							In Progress
						</span>
					) : null}
				</div>

				<h2 className="text-lg font-semibold text-foreground">
					{item.vod?.title ?? "VOD Training Session"}
				</h2>

				<div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground font-mono">
					<span>
						{item.completedAt
							? `Completed: ${new Date(item.completedAt).toLocaleDateString()}`
							: `Started: ${new Date(item.createdAt).toLocaleDateString()}`}
					</span>
					<span>&bull;</span>
					<span>
						Accuracy:{" "}
						<strong className="text-foreground">
							{formatAccuracy(item.accuracy)}
						</strong>
					</span>
					<span>&bull;</span>
					<span>
						Median Latency:{" "}
						<strong className="text-foreground">
							{formatLatency(item.medianLatencyMs)}
						</strong>
					</span>
				</div>

				<div className="flex flex-wrap items-center gap-1.5 pt-1">
					{item.moduleSelections.map((sel) => (
						<span
							className="rounded border border-border bg-muted/60 px-2 py-0.5 text-[10px] font-medium text-muted-foreground"
							key={sel.moduleType}
						>
							{MODULE_LABEL_MAP[sel.moduleType]}
						</span>
					))}
				</div>
			</div>

			<div className="shrink-0">
				{item.status === "COMPLETED" ? (
					<Link
						aria-label="Review details for completed session"
						className="inline-flex items-center justify-center rounded-md bg-secondary px-4 py-2 text-xs font-semibold text-secondary-foreground shadow-sm hover:bg-secondary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
						params={{ playthroughId: item.id }}
						to="/history/$playthroughId"
					>
						Review Details
					</Link>
				) : (
					<Link
						aria-label="Continue training session"
						className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
						params={{ id: item.vodId }}
						to="/vods/$id/session"
					>
						Continue Training &rarr;
					</Link>
				)}
			</div>
		</div>
	);
}

function HistoryPaginationBar({
	data,
	onPageChange,
}: {
	data: PlayerHistoryResult;
	onPageChange: (page: number) => void;
}) {
	const handlePrev = useCallback(
		() => onPageChange(data.page - 1),
		[data.page, onPageChange],
	);
	const handleNext = useCallback(
		() => onPageChange(data.page + 1),
		[data.page, onPageChange],
	);

	return (
		<div className="flex items-center justify-between border-t border-border pt-4 text-xs text-muted-foreground">
			<span>
				Showing page {data.page} of {data.totalPages} ({data.total} total
				sessions)
			</span>
			<div className="flex items-center gap-2">
				<Button
					disabled={data.page <= 1}
					onClick={handlePrev}
					size="sm"
					variant="outline"
				>
					Previous
				</Button>
				<Button
					disabled={data.page >= data.totalPages}
					onClick={handleNext}
					size="sm"
					variant="outline"
				>
					Next
				</Button>
			</div>
		</div>
	);
}

function HistoryEmptyState({
	currentStatus,
}: {
	currentStatus: PlaythroughStatus;
}) {
	return (
		<div className="rounded-lg border border-dashed border-border bg-muted/40 p-8 text-center sm:p-12 space-y-4">
			<p className="text-base font-medium text-foreground">
				{currentStatus === "COMPLETED"
					? "No completed training sessions yet."
					: "No in-progress training sessions."}
			</p>
			<p className="text-sm text-muted-foreground">
				{currentStatus === "COMPLETED"
					? "Complete your first interactive VOD training run to see your accuracy and response latency history."
					: "You have no active incomplete sessions. Start a new session from our catalog."}
			</p>
			<div>
				<Link
					className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90"
					to="/vods"
				>
					Browse Training VODs &rarr;
				</Link>
			</div>
		</div>
	);
}
