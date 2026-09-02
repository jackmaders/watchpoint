/**
 * Composite state management hook coordinating search filters, table sorting, selection, and mutations.
 *
 * Implements `useAdminContentState` and `useContentFilterControls` to synchronize local filter inputs
 * with URL search params and orchestrate table row selections and bulk mutations.
 */
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { AdminVodItem } from "@/shared/db";
import { compareContentVods, matchesContentFilters } from "./content-filters";
import type {
	ContentHeroRoleFilter,
	ContentPublicationStatus,
	ContentSearchParams,
	ContentSortColumn,
	ContentSortOrder,
} from "./search-params";
import { useAdminContentMutations } from "./use-admin-content-mutations";

export interface UseAdminContentOptions {
	initialVods: AdminVodItem[];
	onFilterChange?: (newParams: ContentSearchParams) => void;
	searchParams?: ContentSearchParams;
}

export function useContentFilterControls(
	searchParams: ContentSearchParams,
	onFilterChange?: (newParams: ContentSearchParams) => void,
) {
	const [searchQuery, setSearchQuery] = useState(searchParams.search ?? "");
	const [statusFilter, setStatusFilter] = useState<ContentPublicationStatus>(
		searchParams.status ?? "ALL",
	);
	const [roleFilter, setRoleFilter] = useState<ContentHeroRoleFilter>(
		searchParams.role ?? "ALL",
	);
	const [sortBy, setSortBy] = useState<ContentSortColumn>(
		searchParams.sortBy ?? "createdAt",
	);
	const [sortOrder, setSortOrder] = useState<ContentSortOrder>(
		searchParams.sortOrder ?? "desc",
	);

	useEffect(() => {
		setSearchQuery(searchParams.search ?? "");
		setStatusFilter(searchParams.status ?? "ALL");
		setRoleFilter(searchParams.role ?? "ALL");
		setSortBy(searchParams.sortBy ?? "createdAt");
		setSortOrder(searchParams.sortOrder ?? "desc");
	}, [
		searchParams.search,
		searchParams.status,
		searchParams.role,
		searchParams.sortBy,
		searchParams.sortOrder,
	]);

	const emitFilterChange = useCallback(
		(next: Partial<ContentSearchParams>) => {
			onFilterChange?.({
				role: roleFilter,
				search: searchQuery || undefined,
				sortBy,
				sortOrder,
				status: statusFilter,
				...next,
			});
		},
		[onFilterChange, roleFilter, searchQuery, sortBy, sortOrder, statusFilter],
	);

	const handleSearchChange = useCallback(
		(value: string) => {
			setSearchQuery(value);
			emitFilterChange({ search: value || undefined });
		},
		[emitFilterChange],
	);

	const handleStatusChange = useCallback(
		(status: ContentPublicationStatus) => {
			setStatusFilter(status);
			emitFilterChange({ status });
		},
		[emitFilterChange],
	);

	const handleRoleChange = useCallback(
		(role: ContentHeroRoleFilter) => {
			setRoleFilter(role);
			emitFilterChange({ role });
		},
		[emitFilterChange],
	);

	const handleSortChange = useCallback(
		(newSortBy: ContentSortColumn, newSortOrder: ContentSortOrder) => {
			setSortBy(newSortBy);
			setSortOrder(newSortOrder);
			emitFilterChange({ sortBy: newSortBy, sortOrder: newSortOrder });
		},
		[emitFilterChange],
	);

	return {
		handleRoleChange,
		handleSearchChange,
		handleSortChange,
		handleStatusChange,
		roleFilter,
		searchQuery,
		sortBy,
		sortOrder,
		statusFilter,
	};
}

export function useAdminContentState({
	initialVods,
	onFilterChange,
	searchParams = {},
}: UseAdminContentOptions) {
	const [vods, setVods] = useState<AdminVodItem[]>(initialVods);
	const [selectedIds, setSelectedIds] = useState<string[]>([]);
	const [deleteDialog, setDeleteDialog] = useState<{
		open: boolean;
		vodsToDelete: AdminVodItem[];
	}>({
		open: false,
		vodsToDelete: [],
	});

	const filters = useContentFilterControls(searchParams, onFilterChange);
	const mutations = useAdminContentMutations(setVods, setSelectedIds);

	const filteredAndSortedVods = useMemo(() => {
		return vods
			.filter((v) =>
				matchesContentFilters(
					v,
					filters.statusFilter,
					filters.roleFilter,
					filters.searchQuery,
				),
			)
			.sort((a, b) =>
				compareContentVods(a, b, filters.sortBy, filters.sortOrder),
			);
	}, [
		vods,
		filters.statusFilter,
		filters.roleFilter,
		filters.searchQuery,
		filters.sortBy,
		filters.sortOrder,
	]);

	const handleOpenSingleDelete = useCallback((vod: AdminVodItem) => {
		setDeleteDialog({ open: true, vodsToDelete: [vod] });
	}, []);

	const handleOpenBulkDelete = useCallback(
		(ids: string[]) => {
			const selectedVods = vods.filter((v) => ids.includes(v.id));
			setDeleteDialog({ open: true, vodsToDelete: selectedVods });
		},
		[vods],
	);

	const handleConfirmDelete = useCallback(async () => {
		const ids = deleteDialog.vodsToDelete.map((v) => v.id);
		await mutations.handleExecuteDelete(ids);
		setDeleteDialog({ open: false, vodsToDelete: [] });
	}, [deleteDialog.vodsToDelete, mutations]);

	const totalScenariosToDelete = useMemo(() => {
		return deleteDialog.vodsToDelete.reduce(
			(acc, v) => acc + (v.scenarios?.length ?? 0),
			0,
		);
	}, [deleteDialog.vodsToDelete]);

	const handleDialogClose = useCallback((open: boolean) => {
		setDeleteDialog((prev) => ({ ...prev, open }));
	}, []);

	return {
		deleteDialog,
		error: mutations.error,
		filteredAndSortedVods,
		handleBulkPublish: mutations.handleBulkPublish,
		handleBulkUnpublish: mutations.handleBulkUnpublish,
		handleConfirmDelete,
		handleDialogClose,
		handleDismissAlert: mutations.handleDismissAlert,
		handleOpenBulkDelete,
		handleOpenSingleDelete,
		handleRoleChange: filters.handleRoleChange,
		handleSearchChange: filters.handleSearchChange,
		handleSortChange: filters.handleSortChange,
		handleStatusChange: filters.handleStatusChange,
		handleTogglePublish: mutations.handleTogglePublish,
		isOperating: mutations.isOperating,
		operationResult: mutations.operationResult,
		roleFilter: filters.roleFilter,
		searchQuery: filters.searchQuery,
		selectedIds,
		setSelectedIds,
		sortBy: filters.sortBy,
		sortOrder: filters.sortOrder,
		statusFilter: filters.statusFilter,
		totalScenariosToDelete,
		vods,
	};
}
