"use client";

import type { AdminVodItem } from "@/shared/db";
import type { AuthenticatedUser } from "@/shared/lib/permissions";
import { Alert, AlertDescription } from "@/shared/ui/alert";
import {
	BulkSummaryAlert,
	DeleteConfirmationDialog,
} from "@/widgets/admin-vod-editor";
import type { ContentSearchParams } from "../model/search-params";
import { useAdminContentState } from "../model/use-admin-content";
import { AdminContentFilters } from "./admin-content-filters";
import { AdminContentTable } from "./admin-content-table";

export interface AdminContentPageProps {
	currentUser: AuthenticatedUser;
	initialVods: AdminVodItem[];
	onFilterChange?: (newParams: ContentSearchParams) => void;
	searchParams?: ContentSearchParams;
}

function AdminContentHeader({ totalCount }: { totalCount: number }) {
	return (
		<div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
			<div>
				<h1 className="text-2xl font-bold tracking-tight text-foreground">
					Content Management
				</h1>
				<p className="text-sm text-muted-foreground">
					Manage VOD catalog training sessions, scenarios, and publication
					status.
				</p>
			</div>
			<div className="text-sm font-medium text-muted-foreground">
				{totalCount} Total VODs
			</div>
		</div>
	);
}

export function AdminContentPage({
	initialVods,
	onFilterChange,
	searchParams,
}: AdminContentPageProps) {
	const state = useAdminContentState({
		initialVods,
		onFilterChange,
		searchParams,
	});

	return (
		<div className="space-y-6">
			<AdminContentHeader totalCount={state.vods.length} />

			{state.error ? (
				<Alert aria-live="assertive" variant="destructive">
					<AlertDescription>{state.error}</AlertDescription>
				</Alert>
			) : null}

			{state.operationResult ? (
				<BulkSummaryAlert
					onDismiss={state.handleDismissAlert}
					operationLabel={state.operationResult.label}
					result={state.operationResult.result}
				/>
			) : null}

			<AdminContentFilters
				onRoleChange={state.handleRoleChange}
				onSearchChange={state.handleSearchChange}
				onStatusChange={state.handleStatusChange}
				roleFilter={state.roleFilter}
				searchQuery={state.searchQuery}
				statusFilter={state.statusFilter}
			/>

			<AdminContentTable
				isOperating={state.isOperating}
				onBulkDelete={state.handleOpenBulkDelete}
				onBulkPublish={state.handleBulkPublish}
				onBulkUnpublish={state.handleBulkUnpublish}
				onDelete={state.handleOpenSingleDelete}
				onSelectionChange={state.setSelectedIds}
				onSortChange={state.handleSortChange}
				onTogglePublish={state.handleTogglePublish}
				selectedIds={state.selectedIds}
				sortBy={state.sortBy}
				sortOrder={state.sortOrder}
				vods={state.filteredAndSortedVods}
			/>

			<DeleteConfirmationDialog
				isDeleting={state.isOperating}
				onConfirm={state.handleConfirmDelete}
				onOpenChange={state.handleDialogClose}
				open={state.deleteDialog.open}
				scenarioCount={state.totalScenariosToDelete}
				vodCount={state.deleteDialog.vodsToDelete.length}
			/>
		</div>
	);
}
