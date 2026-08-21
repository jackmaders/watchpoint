"use client";

import { Clock, History, User } from "lucide-react";
import type { auditEntries } from "@/shared/db";

export type AuditEntryItem = typeof auditEntries.$inferSelect & {
	actor?: { email?: string | null; name?: string | null } | null;
};

export interface AuditHistoryPanelProps {
	auditEntries: AuditEntryItem[];
}

export function AuditHistoryPanel({
	auditEntries: entries,
}: AuditHistoryPanelProps) {
	return (
		<div className="rounded-lg border border-border bg-card overflow-hidden shadow-sm">
			<div className="flex items-center gap-2 border-b border-border bg-muted/40 px-4 py-3">
				<History className="h-4 w-4 text-primary" />
				<h3 className="text-sm font-semibold text-foreground">Audit History</h3>
				<span className="text-xs text-muted-foreground ml-auto">
					{entries.length} {entries.length === 1 ? "event" : "events"} recorded
				</span>
			</div>

			{entries.length === 0 ? (
				<div className="p-6 text-center text-xs text-muted-foreground">
					No audit history found for this VOD.
				</div>
			) : (
				<div className="divide-y divide-border max-h-80 overflow-y-auto">
					{entries.map((entry) => {
						const actorName =
							entry.actor?.name || entry.actor?.email || "System / Admin";
						const formattedTime = new Date(entry.createdAt).toLocaleString();

						return (
							<div
								className="p-3 text-xs space-y-1.5 hover:bg-muted/20 transition-colors"
								key={entry.id}
							>
								<div className="flex items-center justify-between">
									<div className="flex items-center gap-2">
										<span className="rounded bg-primary/10 px-1.5 py-0.5 font-mono text-[10px] font-bold text-primary border border-primary/20">
											{entry.action}
										</span>
										<span className="font-mono text-[10px] text-muted-foreground uppercase">
											{entry.entityType}
										</span>
									</div>
									<div className="flex items-center gap-1 text-[11px] text-muted-foreground">
										<Clock className="h-3 w-3" />
										{formattedTime}
									</div>
								</div>

								<div className="flex items-center gap-1.5 text-muted-foreground">
									<User className="h-3 w-3" />
									<span className="font-medium text-foreground">
										{actorName}
									</span>
								</div>

								{entry.metadata && Object.keys(entry.metadata).length > 0 && (
									<pre className="rounded bg-muted/50 p-2 font-mono text-[10px] text-muted-foreground overflow-x-auto">
										{JSON.stringify(entry.metadata, null, 2)}
									</pre>
								)}
							</div>
						);
					})}
				</div>
			)}
		</div>
	);
}
