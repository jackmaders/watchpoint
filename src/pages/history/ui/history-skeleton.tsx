/**
 * Loading skeleton and error state components for the training match history view.
 *
 * Implements `HistoryLoadingSkeleton` and `HistoryErrorState` with accessible roles and retry buttons.
 */
export function HistoryLoadingSkeleton() {
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

export function HistoryErrorState({
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
				<button
					className="inline-flex items-center justify-center rounded-md border border-input bg-background px-3 py-1.5 text-xs font-medium text-foreground shadow-sm hover:bg-accent hover:text-accent-foreground"
					onClick={onRetry}
					type="button"
				>
					Retry
				</button>
			) : null}
		</div>
	);
}
