/**
 * Client-side mutation hooks for single and bulk VOD publication and deletion operations.
 *
 * Implements `usePublicationMutations`, `useDeletionMutations`, and `useAdminContentMutations` to coordinate
 * optimistic updates, error state reporting, and bulk operation summaries against `admin-vod-editor` server actions.
 */
"use client";

import { useCallback, useState } from "react";
import type { AdminVodItem, BulkOperationResult } from "@/shared/db";
import {
	bulkDeleteVods,
	bulkPublishVods,
	deleteVod,
	setVodPublicationStatus,
} from "@/widgets/admin-vod-editor";

export function usePublicationMutations(
	setVods: React.Dispatch<React.SetStateAction<AdminVodItem[]>>,
	setSelectedIds: React.Dispatch<React.SetStateAction<string[]>>,
	setIsOperating: React.Dispatch<React.SetStateAction<boolean>>,
	setError: React.Dispatch<React.SetStateAction<string | null>>,
	setOperationResult: React.Dispatch<
		React.SetStateAction<{
			label: string;
			result: BulkOperationResult;
		} | null>
	>,
) {
	const handleTogglePublish = useCallback(
		async (vod: AdminVodItem, isPublished: boolean) => {
			setError(null);
			setOperationResult(null);
			setIsOperating(true);
			try {
				const result = await setVodPublicationStatus({
					data: { id: vod.id, isPublished },
				});
				if (!result.success) {
					setError(result.error);
					return;
				}
				setVods((prev) =>
					prev.map((v) => (v.id === vod.id ? { ...v, isPublished } : v)),
				);
			} catch {
				setError("Failed to update publication status. Please try again.");
			} finally {
				setIsOperating(false);
			}
		},
		[setError, setIsOperating, setOperationResult, setVods],
	);

	const executeBulkPublish = useCallback(
		async (ids: string[], isPublished: boolean, label: string) => {
			setError(null);
			setOperationResult(null);
			setIsOperating(true);
			try {
				const res = await bulkPublishVods({
					data: { ids, isPublished },
				});
				if (!res.success) {
					setError(res.error);
					return;
				}
				const result = res.data;
				setOperationResult({ label, result });
				if (result.succeeded.length > 0) {
					setVods((prev) =>
						prev.map((v) =>
							result.succeeded.includes(v.id) ? { ...v, isPublished } : v,
						),
					);
					setSelectedIds((prev) =>
						prev.filter((id) => !result.succeeded.includes(id)),
					);
				}
			} catch {
				setError("Failed to perform bulk publication. Please try again.");
			} finally {
				setIsOperating(false);
			}
		},
		[setError, setIsOperating, setOperationResult, setSelectedIds, setVods],
	);

	const handleBulkPublish = useCallback(
		(ids: string[]) => executeBulkPublish(ids, true, "Bulk Publish"),
		[executeBulkPublish],
	);

	const handleBulkUnpublish = useCallback(
		(ids: string[]) => executeBulkPublish(ids, false, "Bulk Unpublish"),
		[executeBulkPublish],
	);

	return { handleBulkPublish, handleBulkUnpublish, handleTogglePublish };
}

export function useDeletionMutations(
	setVods: React.Dispatch<React.SetStateAction<AdminVodItem[]>>,
	setSelectedIds: React.Dispatch<React.SetStateAction<string[]>>,
	setIsOperating: React.Dispatch<React.SetStateAction<boolean>>,
	setError: React.Dispatch<React.SetStateAction<string | null>>,
	setOperationResult: React.Dispatch<
		React.SetStateAction<{
			label: string;
			result: BulkOperationResult;
		} | null>
	>,
) {
	const executeDeleteSingle = useCallback(
		async (id: string) => {
			const result = await deleteVod({ data: { id } });
			if (!result.success) {
				setError(result.error);
			} else {
				setVods((prev) => prev.filter((v) => v.id !== id));
				setSelectedIds((prev) => prev.filter((item) => item !== id));
			}
		},
		[setError, setSelectedIds, setVods],
	);

	const executeDeleteBulk = useCallback(
		async (ids: string[]) => {
			const res = await bulkDeleteVods({ data: { ids } });
			if (!res.success) {
				setError(res.error);
				return;
			}
			const result = res.data;
			setOperationResult({ label: "Bulk Delete", result });
			if (result.succeeded.length > 0) {
				setVods((prev) => prev.filter((v) => !result.succeeded.includes(v.id)));
				setSelectedIds((prev) =>
					prev.filter((id) => !result.succeeded.includes(id)),
				);
			}
		},
		[setError, setOperationResult, setSelectedIds, setVods],
	);

	const handleExecuteDelete = useCallback(
		async (ids: string[]) => {
			setError(null);
			setOperationResult(null);
			setIsOperating(true);
			try {
				if (ids.length === 1) {
					await executeDeleteSingle(ids[0] as string);
				} else {
					await executeDeleteBulk(ids);
				}
			} catch {
				setError("Failed to delete VOD. Please try again.");
			} finally {
				setIsOperating(false);
			}
		},
		[
			executeDeleteBulk,
			executeDeleteSingle,
			setError,
			setIsOperating,
			setOperationResult,
		],
	);

	return { handleExecuteDelete };
}

export function useAdminContentMutations(
	setVods: React.Dispatch<React.SetStateAction<AdminVodItem[]>>,
	setSelectedIds: React.Dispatch<React.SetStateAction<string[]>>,
) {
	const [isOperating, setIsOperating] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [operationResult, setOperationResult] = useState<{
		label: string;
		result: BulkOperationResult;
	} | null>(null);

	const pub = usePublicationMutations(
		setVods,
		setSelectedIds,
		setIsOperating,
		setError,
		setOperationResult,
	);
	const del = useDeletionMutations(
		setVods,
		setSelectedIds,
		setIsOperating,
		setError,
		setOperationResult,
	);

	const handleDismissAlert = useCallback(() => {
		setOperationResult(null);
	}, []);

	return {
		error,
		handleBulkPublish: pub.handleBulkPublish,
		handleBulkUnpublish: pub.handleBulkUnpublish,
		handleDismissAlert,
		handleExecuteDelete: del.handleExecuteDelete,
		handleTogglePublish: pub.handleTogglePublish,
		isOperating,
		operationResult,
	};
}
