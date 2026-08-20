"use client";

import {
	flexRender,
	getCoreRowModel,
	type Table,
	useReactTable,
} from "@tanstack/react-table";
import { useCallback } from "react";
import type { AdminVodItem } from "@/shared/db";
import { Button } from "@/shared/ui/button";
import type {
	ContentSortColumn,
	ContentSortOrder,
} from "../model/search-params";
import { useContentColumns } from "./use-content-columns";

export interface AdminContentTableProps {
	isOperating: boolean;
	onBulkDelete: (ids: string[]) => void;
	onBulkPublish: (ids: string[]) => void;
	onBulkUnpublish: (ids: string[]) => void;
	onDelete: (vod: AdminVodItem) => void;
	onSelectionChange: (ids: string[]) => void;
	onSortChange: (column: ContentSortColumn, order: ContentSortOrder) => void;
	onTogglePublish: (vod: AdminVodItem, isPublished: boolean) => void;
	selectedIds: string[];
	sortBy?: ContentSortColumn;
	sortOrder?: ContentSortOrder;
	vods: AdminVodItem[];
}

interface BulkActionsToolbarProps {
	isOperating: boolean;
	onBulkDelete: () => void;
	onBulkPublish: () => void;
	onBulkUnpublish: () => void;
	selectedCount: number;
}

function BulkActionsToolbar({
	isOperating,
	onBulkDelete,
	onBulkPublish,
	onBulkUnpublish,
	selectedCount,
}: BulkActionsToolbarProps) {
	if (selectedCount === 0) return null;

	return (
		<div className="flex items-center justify-between rounded-lg border border-primary/30 bg-primary/5 px-4 py-3">
			<span className="text-sm font-medium text-primary">
				{selectedCount} selected
			</span>
			<div className="flex items-center gap-2">
				<Button
					aria-label="Bulk Publish"
					disabled={isOperating}
					onClick={onBulkPublish}
					size="sm"
					variant="default"
				>
					Bulk Publish
				</Button>
				<Button
					aria-label="Bulk Unpublish"
					disabled={isOperating}
					onClick={onBulkUnpublish}
					size="sm"
					variant="outline"
				>
					Bulk Unpublish
				</Button>
				<Button
					aria-label="Bulk Delete"
					disabled={isOperating}
					onClick={onBulkDelete}
					size="sm"
					variant="destructive"
				>
					Bulk Delete
				</Button>
			</div>
		</div>
	);
}

interface AdminContentTableViewProps {
	columnsCount: number;
	selectedIds: string[];
	table: Table<AdminVodItem>;
}

function AdminContentTableView({
	columnsCount,
	selectedIds,
	table,
}: AdminContentTableViewProps) {
	return (
		<div className="rounded-lg border border-border bg-card overflow-hidden shadow-sm">
			<div className="overflow-x-auto">
				<table className="w-full text-left text-sm">
					<thead className="border-b border-border bg-muted/50 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
						{table.getHeaderGroups().map((headerGroup) => (
							<tr key={headerGroup.id}>
								{headerGroup.headers.map((header) => (
									<th className="px-4 py-3" key={header.id} scope="col">
										{flexRender(
											header.column.columnDef.header,
											header.getContext(),
										)}
									</th>
								))}
							</tr>
						))}
					</thead>
					<tbody className="divide-y divide-border">
						{table.getRowModel().rows.length === 0 ? (
							<tr>
								<td
									className="px-4 py-8 text-center text-muted-foreground"
									colSpan={columnsCount}
								>
									No content VODs found matching criteria.
								</td>
							</tr>
						) : (
							table.getRowModel().rows.map((row) => (
								<tr
									className={`hover:bg-muted/30 transition-colors ${
										selectedIds.includes(row.original.id) ? "bg-muted/20" : ""
									}`}
									key={row.id}
								>
									{row.getVisibleCells().map((cell) => (
										<td className="px-4 py-3.5" key={cell.id}>
											{flexRender(
												cell.column.columnDef.cell,
												cell.getContext(),
											)}
										</td>
									))}
								</tr>
							))
						)}
					</tbody>
				</table>
			</div>
		</div>
	);
}

export function AdminContentTable({
	isOperating,
	onBulkDelete,
	onBulkPublish,
	onBulkUnpublish,
	onDelete,
	onSelectionChange,
	onSortChange,
	onTogglePublish,
	selectedIds,
	sortBy = "createdAt",
	sortOrder = "desc",
	vods,
}: AdminContentTableProps) {
	const allSelected = vods.length > 0 && selectedIds.length === vods.length;
	const someSelected =
		selectedIds.length > 0 && selectedIds.length < vods.length;

	const handleSelectAll = useCallback(() => {
		if (allSelected) {
			onSelectionChange([]);
		} else {
			onSelectionChange(vods.map((v) => v.id));
		}
	}, [allSelected, onSelectionChange, vods]);

	const handleToggleRow = useCallback(
		(id: string) => {
			if (selectedIds.includes(id)) {
				onSelectionChange(selectedIds.filter((item) => item !== id));
			} else {
				onSelectionChange([...selectedIds, id]);
			}
		},
		[onSelectionChange, selectedIds],
	);

	const handleHeaderSort = useCallback(
		(column: ContentSortColumn) => {
			if (sortBy === column) {
				const nextOrder: ContentSortOrder =
					sortOrder === "asc" ? "desc" : "asc";
				onSortChange(column, nextOrder);
			} else {
				onSortChange(column, "asc");
			}
		},
		[onSortChange, sortBy, sortOrder],
	);

	const handleBulkPublishClick = useCallback(() => {
		onBulkPublish(selectedIds);
	}, [onBulkPublish, selectedIds]);

	const handleBulkUnpublishClick = useCallback(() => {
		onBulkUnpublish(selectedIds);
	}, [onBulkUnpublish, selectedIds]);

	const handleBulkDeleteClick = useCallback(() => {
		onBulkDelete(selectedIds);
	}, [onBulkDelete, selectedIds]);

	const columns = useContentColumns({
		allSelected,
		handleHeaderSort,
		handleSelectAll,
		handleToggleRow,
		isOperating,
		onDelete,
		onTogglePublish,
		selectedIds,
		someSelected,
		sortBy,
		sortOrder,
	});

	const table = useReactTable({
		columns,
		data: vods,
		getCoreRowModel: getCoreRowModel(),
	});

	return (
		<div className="space-y-4">
			<BulkActionsToolbar
				isOperating={isOperating}
				onBulkDelete={handleBulkDeleteClick}
				onBulkPublish={handleBulkPublishClick}
				onBulkUnpublish={handleBulkUnpublishClick}
				selectedCount={selectedIds.length}
			/>

			<AdminContentTableView
				columnsCount={columns.length}
				selectedIds={selectedIds}
				table={table}
			/>
		</div>
	);
}
