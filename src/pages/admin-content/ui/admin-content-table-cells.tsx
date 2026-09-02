/**
 * Table cell and header components for the administrative VOD content table.
 *
 * Implements interactive table primitives including `SortHeaderButton`, `StatusBadgeCell`, `RoleBadgeCell`,
 * and `RowActionsCell` for publication toggles and deletion actions.
 */
"use client";

import { ArrowDown, ArrowUp, ArrowUpDown, Trash2 } from "lucide-react";
import { useCallback } from "react";
import type { AdminVodItem } from "@/shared/db";
import { Button } from "@/shared/ui/button";
import type {
	ContentSortColumn,
	ContentSortOrder,
} from "../model/search-params";

export interface SortHeaderButtonProps {
	column: ContentSortColumn;
	label: string;
	onSort: (column: ContentSortColumn) => void;
	sortBy: ContentSortColumn;
	sortOrder: ContentSortOrder;
}

export function SortHeaderButton({
	column,
	label,
	onSort,
	sortBy,
	sortOrder,
}: SortHeaderButtonProps) {
	const handleClick = useCallback(() => {
		onSort(column);
	}, [column, onSort]);

	return (
		<button
			aria-label={`Sort by ${label}`}
			className="flex items-center text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground"
			onClick={handleClick}
			type="button"
		>
			{label}{" "}
			{sortBy !== column ? (
				<ArrowUpDown className="ml-1 size-3 text-muted-foreground/60" />
			) : sortOrder === "asc" ? (
				<ArrowUp className="ml-1 size-3 text-primary" />
			) : (
				<ArrowDown className="ml-1 size-3 text-primary" />
			)}
		</button>
	);
}

export interface RowActionsCellProps {
	isOperating: boolean;
	onDelete: (vod: AdminVodItem) => void;
	onTogglePublish: (vod: AdminVodItem, isPublished: boolean) => void;
	vod: AdminVodItem;
}

export function RowActionsCell({
	isOperating,
	onDelete,
	onTogglePublish,
	vod,
}: RowActionsCellProps) {
	const handleToggle = useCallback(() => {
		onTogglePublish(vod, !vod.isPublished);
	}, [onTogglePublish, vod]);

	const handleDelete = useCallback(() => {
		onDelete(vod);
	}, [onDelete, vod]);

	return (
		<div className="flex items-center justify-end gap-2">
			<Button
				aria-label={
					vod.isPublished ? `Unpublish ${vod.title}` : `Publish ${vod.title}`
				}
				disabled={isOperating}
				onClick={handleToggle}
				size="sm"
				variant={vod.isPublished ? "outline" : "default"}
			>
				{vod.isPublished ? "Unpublish" : "Publish"}
			</Button>
			<Button
				aria-label={`Delete ${vod.title}`}
				disabled={isOperating}
				onClick={handleDelete}
				size="sm"
				variant="destructive"
			>
				<Trash2 className="size-3.5" />
				<span className="sr-only">Delete</span>
			</Button>
		</div>
	);
}
