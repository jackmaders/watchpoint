/**
 * Empty state presentation component rendered when no training match history records exist.
 *
 * Implements `HistoryEmptyState` tailoring its prompt and call-to-action to either completed or
 * in-progress training sessions.
 */
import { Link } from "@tanstack/react-router";
import type { PlaythroughStatus } from "@/shared/db";

export function HistoryEmptyState({
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
