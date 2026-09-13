/**
 * Training match history page presenting aggregated performance metrics, filter bars, and playthrough lists.
 *
 * Implements `HistoryPage` wrapped in `AppLayout`, composing summary hero statistics, filter controls (`HistoryFilterBar`),
 * and paginated lists of `HistoryItemCard` components.
 */
import { useCallback } from "react";
import type {
	ModuleType,
	PlayerHistoryResult,
	PlaythroughStatus,
	PublishedVodItem,
} from "@/shared/db";
import { Button } from "@/shared/ui/button";
import { AppLayout } from "@/widgets/layout-main";
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
		<AppLayout registrationEnabled={props.registrationEnabled ?? true}>
			<div className="mx-auto max-w-6xl space-y-8">
				<HistoryHeader />
				<HistoryMainContent {...props} />
			</div>
		</AppLayout>
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
	searchParams,
	vods,
}: HistoryPageProps) {
	const items = data?.items ?? [];
	const currentStatus = searchParams?.status ?? "COMPLETED";

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
		(vodId: string | undefined) => {
			onFilterChange?.({
				...searchParams,
				page: 1,
				vodId: vodId || undefined,
			});
		},
		[onFilterChange, searchParams],
	);

	const handleModuleToggle = useCallback(
		(module: ModuleType) => {
			const currentModules = searchParams?.modules ?? [];
			const exists = currentModules.includes(module);
			const nextModules = exists
				? currentModules.filter((m) => m !== module)
				: [...currentModules, module];

			onFilterChange?.({
				...searchParams,
				modules: nextModules.length > 0 ? nextModules : undefined,
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
				selectedModules={searchParams?.modules ?? []}
				selectedVodId={searchParams?.vodId ?? ""}
				vods={vods ?? []}
			/>

			{items.length === 0 ? (
				<HistoryEmptyState currentStatus={currentStatus} />
			) : (
				<div className="space-y-4">
					<div className="grid grid-cols-1 gap-4">
						{items.map((item) => (
							<HistoryItemCard item={item} key={item.id} />
						))}
					</div>

					{data && data.totalPages > 1 ? (
						<HistoryPaginationBar data={data} onPageChange={handlePageChange} />
					) : null}
				</div>
			)}
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
