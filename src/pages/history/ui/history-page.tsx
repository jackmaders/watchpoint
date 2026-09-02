/**
 * Training match history page presenting aggregated performance metrics, filter bars, and playthrough lists.
 *
 * Implements `HistoryPage` composing top navigation, summary hero statistics, filter controls (`HistoryFilterBar`),
 * and paginated lists of `HistoryItemCard` components.
 */
import { Link } from "@tanstack/react-router";
import { useCallback } from "react";
import type {
	ModuleType,
	PlayerHistoryResult,
	PlaythroughStatus,
	PublishedVodItem,
} from "@/shared/db";
import { AccountControls } from "@/shared/ui/auth-modal";
import { Button } from "@/shared/ui/button";
import type { HistorySearchParams } from "../model/search-params";
import { HistoryEmptyState } from "./history-empty-state";
import { HistoryFilterBar } from "./history-filter-bar";
import { HistoryItemCard } from "./history-item-card";
import { HistoryErrorState, HistoryLoadingSkeleton } from "./history-skeleton";

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
		<div className="flex items-center justify-between border-t border-border pt-4">
			<div className="text-xs text-muted-foreground">
				Page {data.page} of {data.totalPages} ({data.total} total sessions)
			</div>
			<div className="flex items-center gap-2">
				<Button
					disabled={data.page <= 1}
					onClick={handlePrev}
					size="sm"
					variant="outline"
				>
					&larr; Previous
				</Button>
				<Button
					disabled={data.page >= data.totalPages}
					onClick={handleNext}
					size="sm"
					variant="outline"
				>
					Next &rarr;
				</Button>
			</div>
		</div>
	);
}
