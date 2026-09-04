/**
 * Interactive administrative audit log page component rendering system events, filters, and diff details.
 *
 * Implements `AdminAuditPage` with expandable log row entries, actor identification, action badge styling,
 * text search filtering, and action category selectors.
 */
"use client";

import { ChevronDown, ChevronUp } from "lucide-react";
import { useCallback, useEffect, useId, useMemo, useState } from "react";
import type { auditEntries, UserItem } from "@/shared/db";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import type { AuditSearchParams } from "../model/search-params";

export type AdminAuditLogItem = typeof auditEntries.$inferSelect & {
	actor?: UserItem | null;
};

export interface AdminAuditPageProps {
	logs: AdminAuditLogItem[];
	onFilterChange?: (newParams: AuditSearchParams) => void;
	searchParams?: AuditSearchParams;
}

function getActionBadgeStyle(action: string) {
	if (action.includes("CREATED") || action.includes("PUBLISHED")) {
		return "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";
	}
	if (action.includes("DELETED") || action.includes("UNPUBLISHED")) {
		return "bg-red-500/10 text-red-500 border-red-500/20";
	}
	if (action.includes("UPDATED")) {
		return "bg-blue-500/10 text-blue-500 border-blue-500/20";
	}
	return "bg-muted text-muted-foreground border-border";
}

function matchesAuditSearch(log: AdminAuditLogItem, query: string): boolean {
	const trimmed = query.trim().toLowerCase();
	if (!trimmed) return true;

	const actorMatch =
		(log.actor?.name?.toLowerCase().includes(trimmed) ?? false) ||
		(log.actor?.email.toLowerCase().includes(trimmed) ?? false) ||
		(log.actorUserId?.toLowerCase().includes(trimmed) ?? false);
	const actionMatch = log.action.toLowerCase().includes(trimmed);
	const entityMatch =
		log.entityType.toLowerCase().includes(trimmed) ||
		log.entityId.toLowerCase().includes(trimmed);
	const metadataMatch = JSON.stringify(log.metadata)
		.toLowerCase()
		.includes(trimmed);

	return actorMatch || actionMatch || entityMatch || metadataMatch;
}

interface AdminAuditTableRowProps {
	isExpanded: boolean;
	log: AdminAuditLogItem;
	onToggleExpand: (id: string) => void;
}

function AdminAuditTableRow({
	isExpanded,
	log,
	onToggleExpand,
}: AdminAuditTableRowProps) {
	const handleToggle = useCallback(() => {
		onToggleExpand(log.id);
	}, [log.id, onToggleExpand]);

	return (
		<tr className="hover:bg-muted/30 transition-colors">
			<td className="px-6 py-4 text-xs text-muted-foreground whitespace-nowrap">
				{new Date(log.createdAt).toLocaleString()}
			</td>
			<td className="px-6 py-4">
				<span
					className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium border ${getActionBadgeStyle(
						log.action,
					)}`}
				>
					{log.action}
				</span>
			</td>
			<td className="px-6 py-4">
				{log.actor ? (
					<div>
						<div className="font-medium text-foreground">{log.actor.name}</div>
						<div className="text-xs text-muted-foreground">
							{log.actor.email}
						</div>
					</div>
				) : (
					<span className="text-muted-foreground text-xs italic">
						System / Automated
					</span>
				)}
			</td>
			<td className="px-6 py-4 text-xs font-mono text-muted-foreground">
				{log.entityType}: {log.entityId}
			</td>
			<td className="px-6 py-4 text-right">
				<Button
					aria-label={
						isExpanded
							? `Hide details for ${log.id}`
							: `View details for ${log.id}`
					}
					className="h-8 gap-1 text-xs"
					onClick={handleToggle}
					size="sm"
					variant="ghost"
				>
					{isExpanded ? (
						<>
							Hide Details <ChevronUp className="size-3" />
						</>
					) : (
						<>
							View Details <ChevronDown className="size-3" />
						</>
					)}
				</Button>
				{isExpanded ? (
					<div className="mt-2 rounded-md border border-border bg-muted/40 p-3 text-left">
						<pre className="font-mono text-xs text-foreground overflow-x-auto">
							{JSON.stringify(log.metadata, null, 2)}
						</pre>
					</div>
				) : null}
			</td>
		</tr>
	);
}

export function AdminAuditPage({
	logs,
	onFilterChange,
	searchParams = {},
}: AdminAuditPageProps) {
	const [searchQuery, setSearchQuery] = useState(searchParams.search ?? "");
	const [selectedAction, setSelectedAction] = useState<string>(
		searchParams.action ?? "ALL",
	);
	const [expandedLogIds, setExpandedLogIds] = useState<string[]>([]);

	useEffect(() => {
		setSearchQuery(searchParams.search ?? "");
		setSelectedAction(searchParams.action ?? "ALL");
	}, [searchParams.search, searchParams.action]);

	const actionTypes = useMemo(() => {
		const actions = Array.from(new Set(logs.map((l) => l.action)));
		return ["ALL", ...actions];
	}, [logs]);

	const toggleExpand = useCallback((id: string) => {
		setExpandedLogIds((prev) =>
			prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
		);
	}, []);

	const handleSearchChange = useCallback(
		(e: React.ChangeEvent<HTMLInputElement>) => {
			const value = e.target.value;
			setSearchQuery(value);
			onFilterChange?.({
				action: selectedAction,
				search: value || undefined,
			});
		},
		[onFilterChange, selectedAction],
	);

	const handleActionChange = useCallback(
		(e: React.ChangeEvent<HTMLSelectElement>) => {
			const value = e.target.value;
			setSelectedAction(value);
			onFilterChange?.({
				action: value,
				search: searchQuery || undefined,
			});
		},
		[onFilterChange, searchQuery],
	);

	const filteredLogs = useMemo(() => {
		return logs.filter((log) => {
			if (selectedAction !== "ALL" && log.action !== selectedAction) {
				return false;
			}
			return matchesAuditSearch(log, searchQuery);
		});
	}, [logs, selectedAction, searchQuery]);

	const actionSelectId = useId();

	return (
		<div className="space-y-6">
			<div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<h1 className="text-2xl font-bold tracking-tight text-foreground">
						Audit Log
					</h1>
					<p className="text-sm text-muted-foreground">
						Track and inspect administrative actions, catalog modifications, and
						user privilege changes.
					</p>
				</div>
				<div className="text-sm font-medium text-muted-foreground">
					{logs.length} Total Log Entries
				</div>
			</div>

			<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<div className="w-full sm:max-w-xs">
					<Input
						onChange={handleSearchChange}
						placeholder="Search by actor, action, or entity…"
						value={searchQuery}
					/>
				</div>
				<div className="flex items-center gap-2">
					<label
						className="text-xs font-medium text-muted-foreground whitespace-nowrap"
						htmlFor={actionSelectId}
					>
						Filter by Action:
					</label>
					<select
						className="h-9 rounded-md border border-input bg-card px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
						id={actionSelectId}
						onChange={handleActionChange}
						value={selectedAction}
					>
						{actionTypes.map((action) => (
							<option key={action} value={action}>
								{action === "ALL" ? "All Actions" : `${action}`}
							</option>
						))}
					</select>
				</div>
			</div>

			<div className="rounded-lg border border-border bg-card overflow-hidden shadow-sm">
				<div className="overflow-x-auto">
					<table className="w-full text-left text-sm">
						<thead className="border-b border-border bg-muted/50 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
							<tr>
								<th className="px-6 py-3" scope="col">
									Timestamp
								</th>
								<th className="px-6 py-3" scope="col">
									Action
								</th>
								<th className="px-6 py-3" scope="col">
									Actor
								</th>
								<th className="px-6 py-3" scope="col">
									Target Entity
								</th>
								<th className="px-6 py-3 text-right" scope="col">
									Metadata
								</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-border">
							{filteredLogs.length === 0 ? (
								<tr>
									<td
										className="px-6 py-8 text-center text-muted-foreground"
										colSpan={5}
									>
										No audit log entries found matching criteria.
									</td>
								</tr>
							) : (
								filteredLogs.map((log) => (
									<AdminAuditTableRow
										isExpanded={expandedLogIds.includes(log.id)}
										key={log.id}
										log={log}
										onToggleExpand={toggleExpand}
									/>
								))
							)}
						</tbody>
					</table>
				</div>
			</div>
		</div>
	);
}
