"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { useCallback, useMemo } from "react";
import type { AdminVodItem } from "@/shared/db";
import { formatDuration } from "@/shared/lib/utils";
import type {
	ContentSortColumn,
	ContentSortOrder,
} from "../model/search-params";
import { RowActionsCell, SortHeaderButton } from "./admin-content-table-cells";

export interface RowSelectionCellProps {
	id: string;
	isSelected: boolean;
	onToggle: (id: string) => void;
	title: string;
}

export function RowSelectionCell({
	id,
	isSelected,
	onToggle,
	title,
}: RowSelectionCellProps) {
	const handleToggle = useCallback(() => {
		onToggle(id);
	}, [id, onToggle]);

	return (
		<div className="flex items-center">
			<input
				aria-label={`Select ${title}`}
				checked={isSelected}
				className="size-4 rounded border-border text-primary focus:ring-ring"
				onChange={handleToggle}
				type="checkbox"
			/>
		</div>
	);
}

export interface HeaderSelectionCellProps {
	allSelected: boolean;
	onSelectAll: () => void;
	someSelected: boolean;
}

export function HeaderSelectionCell({
	allSelected,
	onSelectAll,
	someSelected,
}: HeaderSelectionCellProps) {
	const setInputRef = useCallback(
		(el: HTMLInputElement | null) => {
			if (el) {
				el.indeterminate = someSelected;
			}
		},
		[someSelected],
	);

	return (
		<div className="flex items-center">
			<input
				aria-label="Select all rows"
				checked={allSelected}
				className="size-4 rounded border-border text-primary focus:ring-ring"
				onChange={onSelectAll}
				ref={setInputRef}
				type="checkbox"
			/>
		</div>
	);
}

function createTextColumn(
	key: "title" | "heroName" | "mapName",
	label: string,
	sortBy: ContentSortColumn,
	sortOrder: ContentSortOrder,
	handleHeaderSort: (column: ContentSortColumn) => void,
): ColumnDef<AdminVodItem> {
	return {
		accessorKey: key,
		cell: ({ row }) => (
			<span
				className={
					key === "title"
						? "font-medium text-foreground max-w-xs truncate block"
						: key === "heroName"
							? "text-foreground"
							: "text-muted-foreground"
				}
			>
				{row.original[key]}
			</span>
		),
		header: () => (
			<SortHeaderButton
				column={key}
				label={label}
				onSort={handleHeaderSort}
				sortBy={sortBy}
				sortOrder={sortOrder}
			/>
		),
	};
}

function createRoleColumn(
	sortBy: ContentSortColumn,
	sortOrder: ContentSortOrder,
	handleHeaderSort: (column: ContentSortColumn) => void,
): ColumnDef<AdminVodItem> {
	return {
		accessorKey: "role",
		cell: ({ row }) => {
			const role = row.original.role;
			const roleClass =
				role === "TANK"
					? "bg-blue-500/10 text-blue-500 border border-blue-500/20"
					: role === "DAMAGE"
						? "bg-red-500/10 text-red-500 border border-red-500/20"
						: "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20";
			return (
				<span
					className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-semibold ${roleClass}`}
				>
					{role}
				</span>
			);
		},
		header: () => (
			<SortHeaderButton
				column="role"
				label="Role"
				onSort={handleHeaderSort}
				sortBy={sortBy}
				sortOrder={sortOrder}
			/>
		),
	};
}

function createMetricsColumns(
	sortBy: ContentSortColumn,
	sortOrder: ContentSortOrder,
	handleHeaderSort: (column: ContentSortColumn) => void,
): ColumnDef<AdminVodItem>[] {
	return [
		{
			accessorKey: "durationSeconds",
			cell: ({ row }) => (
				<span className="font-mono text-xs text-muted-foreground">
					{formatDuration(row.original.durationSeconds)}
				</span>
			),
			header: () => (
				<SortHeaderButton
					column="durationSeconds"
					label="Duration"
					onSort={handleHeaderSort}
					sortBy={sortBy}
					sortOrder={sortOrder}
				/>
			),
		},
		{
			accessorKey: "scenarioCount",
			cell: ({ row }) => (
				<span className="text-xs text-muted-foreground">
					{row.original.scenarios?.length ?? 0} Scenarios
				</span>
			),
			header: () => (
				<SortHeaderButton
					column="scenarioCount"
					label="Scenarios"
					onSort={handleHeaderSort}
					sortBy={sortBy}
					sortOrder={sortOrder}
				/>
			),
		},
	];
}

function createStatusAndDateColumns(
	sortBy: ContentSortColumn,
	sortOrder: ContentSortOrder,
	handleHeaderSort: (column: ContentSortColumn) => void,
): ColumnDef<AdminVodItem>[] {
	return [
		{
			accessorKey: "isPublished",
			cell: ({ row }) => {
				const isPublished = row.original.isPublished;
				return (
					<span
						className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
							isPublished
								? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
								: "bg-muted text-muted-foreground border border-border"
						}`}
					>
						{isPublished ? "Published" : "Draft"}
					</span>
				);
			},
			header: () => (
				<SortHeaderButton
					column="isPublished"
					label="Status"
					onSort={handleHeaderSort}
					sortBy={sortBy}
					sortOrder={sortOrder}
				/>
			),
		},
		{
			accessorKey: "createdAt",
			cell: ({ row }) => (
				<span className="text-xs text-muted-foreground">
					{new Date(row.original.createdAt).toLocaleDateString()}
				</span>
			),
			header: () => (
				<SortHeaderButton
					column="createdAt"
					label="Created Date"
					onSort={handleHeaderSort}
					sortBy={sortBy}
					sortOrder={sortOrder}
				/>
			),
		},
	];
}

export interface UseContentColumnsOptions {
	allSelected: boolean;
	handleHeaderSort: (column: ContentSortColumn) => void;
	handleSelectAll: () => void;
	handleToggleRow: (id: string) => void;
	isOperating: boolean;
	onDelete: (vod: AdminVodItem) => void;
	onTogglePublish: (vod: AdminVodItem, isPublished: boolean) => void;
	selectedIds: string[];
	someSelected: boolean;
	sortBy: ContentSortColumn;
	sortOrder: ContentSortOrder;
}

export function useContentColumns({
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
}: UseContentColumnsOptions) {
	const renderSelectionCell = useCallback(
		({ row }: { row: { original: AdminVodItem } }) => {
			const isSelected = selectedIds.includes(row.original.id);
			return (
				<RowSelectionCell
					id={row.original.id}
					isSelected={isSelected}
					onToggle={handleToggleRow}
					title={row.original.title}
				/>
			);
		},
		[handleToggleRow, selectedIds],
	);

	const renderSelectionHeader = useCallback(() => {
		return (
			<HeaderSelectionCell
				allSelected={allSelected}
				onSelectAll={handleSelectAll}
				someSelected={someSelected}
			/>
		);
	}, [allSelected, handleSelectAll, someSelected]);

	return useMemo<ColumnDef<AdminVodItem>[]>(
		() => [
			{
				cell: renderSelectionCell,
				header: renderSelectionHeader,
				id: "select",
			},
			createTextColumn("title", "Title", sortBy, sortOrder, handleHeaderSort),
			createTextColumn("heroName", "Hero", sortBy, sortOrder, handleHeaderSort),
			createRoleColumn(sortBy, sortOrder, handleHeaderSort),
			createTextColumn("mapName", "Map", sortBy, sortOrder, handleHeaderSort),
			...createMetricsColumns(sortBy, sortOrder, handleHeaderSort),
			...createStatusAndDateColumns(sortBy, sortOrder, handleHeaderSort),
			{
				cell: ({ row }) => (
					<RowActionsCell
						isOperating={isOperating}
						onDelete={onDelete}
						onTogglePublish={onTogglePublish}
						vod={row.original}
					/>
				),
				header: () => <span className="sr-only">Actions</span>,
				id: "actions",
			},
		],
		[
			renderSelectionCell,
			renderSelectionHeader,
			handleHeaderSort,
			sortBy,
			sortOrder,
			isOperating,
			onDelete,
			onTogglePublish,
		],
	);
}
