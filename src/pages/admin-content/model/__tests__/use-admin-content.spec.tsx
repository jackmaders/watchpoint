import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AdminVodItem } from "@/shared/db";

vi.mock("@/widgets/admin-vod-editor");

import {
	bulkDeleteVods,
	bulkPublishVods,
	deleteVod,
	setVodPublicationStatus,
} from "@/widgets/admin-vod-editor";
import { useAdminContentState } from "../use-admin-content";

const mockInitialVods: AdminVodItem[] = [
	{
		createdAt: new Date("2026-01-01T12:00:00Z"),
		durationSeconds: 600,
		heroName: "Reinhardt",
		id: "vod_1",
		isPublished: true,
		mapName: "King's Row",
		rankTier: "GM",
		role: "TANK",
		scenarios: [{ id: "sc_1" }],
		title: "GM Rein",
		youtubeVideoId: "yt_rein",
	},
	{
		createdAt: new Date("2026-01-02T12:00:00Z"),
		durationSeconds: 900,
		heroName: "Tracer",
		id: "vod_2",
		isPublished: false,
		mapName: "Oasis",
		rankTier: "Top 500",
		role: "DAMAGE",
		scenarios: [],
		title: "Tracer Dive",
		youtubeVideoId: "yt_tracer",
	},
];

describe("useAdminContentState", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("initializes default state and filters vods", () => {
		// Arrange & Act
		const { result } = renderHook(() =>
			useAdminContentState({ initialVods: mockInitialVods }),
		);

		// Assert
		expect(result.current.vods).toHaveLength(2);
		expect(result.current.selectedIds).toEqual([]);
		expect(result.current.isOperating).toBe(false);
		expect(result.current.error).toBeNull();
		expect(result.current.operationResult).toBeNull();
		expect(result.current.deleteDialog.open).toBe(false);
	});

	it("updates search query and invokes onFilterChange", () => {
		// Arrange
		const onFilterChange = vi.fn();
		const { result } = renderHook(() =>
			useAdminContentState({
				initialVods: mockInitialVods,
				onFilterChange,
			}),
		);

		// Act
		act(() => {
			result.current.handleSearchChange("tracer");
		});

		// Assert
		expect(result.current.searchQuery).toBe("tracer");
		expect(onFilterChange).toHaveBeenCalledWith(
			expect.objectContaining({ search: "tracer" }),
		);
	});

	it("handles bulk unpublish and dismiss alert", async () => {
		// Arrange
		vi.mocked(bulkPublishVods).mockResolvedValueOnce({
			data: {
				failed: [],
				succeeded: ["vod_1"],
			},
			success: true,
		});
		const { result } = renderHook(() =>
			useAdminContentState({ initialVods: mockInitialVods }),
		);

		// Act: Bulk unpublish
		await act(async () => {
			await result.current.handleBulkUnpublish(["vod_1"]);
		});

		// Assert
		expect(result.current.operationResult?.label).toBe("Bulk Unpublish");

		// Act: Dismiss alert
		act(() => {
			result.current.handleDismissAlert();
		});

		// Assert
		expect(result.current.operationResult).toBeNull();
	});

	it("handles single delete confirmation and dialog close", async () => {
		// Arrange
		vi.mocked(deleteVod).mockResolvedValueOnce({
			data: null,
			success: true,
		});
		const { result } = renderHook(() =>
			useAdminContentState({ initialVods: mockInitialVods }),
		);

		// Act: Open single delete dialog
		act(() => {
			result.current.handleOpenSingleDelete(mockInitialVods[0] as AdminVodItem);
		});

		// Assert
		expect(result.current.deleteDialog.open).toBe(true);
		expect(result.current.totalScenariosToDelete).toBe(1);

		// Act: Confirm delete
		await act(async () => {
			await result.current.handleConfirmDelete();
		});

		// Assert
		expect(result.current.vods).toHaveLength(1);
		expect(result.current.deleteDialog.open).toBe(false);
	});

	it("handles bulk publish with succeeded and empty succeeded", async () => {
		// Arrange
		vi.mocked(bulkPublishVods).mockResolvedValueOnce({
			data: {
				failed: [{ error: "Draft error", id: "vod_2" }],
				succeeded: [],
			},
			success: true,
		});
		const { result } = renderHook(() =>
			useAdminContentState({ initialVods: mockInitialVods }),
		);

		// Act: Bulk publish with zero succeeded
		await act(async () => {
			await result.current.handleBulkPublish(["vod_2"]);
		});

		// Assert
		expect(result.current.operationResult?.result.failed).toHaveLength(1);
	});

	it("handles bulk delete with succeeded and empty succeeded", async () => {
		// Arrange
		vi.mocked(bulkDeleteVods).mockResolvedValueOnce({
			data: {
				failed: [{ error: "Foreign key error", id: "vod_1" }],
				succeeded: [],
			},
			success: true,
		});
		const { result } = renderHook(() =>
			useAdminContentState({ initialVods: mockInitialVods }),
		);

		// Act: Open bulk delete and confirm
		act(() => {
			result.current.handleOpenBulkDelete(["vod_1", "vod_2"]);
		});
		await act(async () => {
			await result.current.handleConfirmDelete();
		});

		// Assert
		expect(result.current.operationResult?.result.failed).toHaveLength(1);
		expect(result.current.vods).toHaveLength(2);
	});

	it("handles status, role, and sort change handlers", () => {
		// Arrange
		const onFilterChange = vi.fn();
		const { result } = renderHook(() =>
			useAdminContentState({
				initialVods: mockInitialVods,
				onFilterChange,
			}),
		);

		// Act
		act(() => {
			result.current.handleStatusChange("DRAFT");
			result.current.handleRoleChange("DAMAGE");
			result.current.handleSortChange("heroName", "asc");
		});

		// Assert
		expect(result.current.statusFilter).toBe("DRAFT");
		expect(result.current.roleFilter).toBe("DAMAGE");
		expect(result.current.sortBy).toBe("heroName");
		expect(result.current.sortOrder).toBe("asc");
	});

	it("calculates totalScenariosToDelete when scenarios array is undefined", () => {
		// Arrange
		const vodsWithoutScenarios = [
			{
				...mockInitialVods[0],
				id: "vod_no_sc_del",
				scenarios: undefined as unknown as [],
			},
		];
		const { result } = renderHook(() =>
			useAdminContentState({
				initialVods: vodsWithoutScenarios as AdminVodItem[],
			}),
		);

		// Act
		act(() => {
			result.current.handleOpenSingleDelete(
				vodsWithoutScenarios[0] as AdminVodItem,
			);
		});

		// Assert
		expect(result.current.totalScenariosToDelete).toBe(0);
	});

	it("handles handleTogglePublish mutation", async () => {
		// Arrange
		vi.mocked(setVodPublicationStatus).mockResolvedValueOnce({
			data: mockInitialVods[1] as never,
			success: true,
		});
		const { result } = renderHook(() =>
			useAdminContentState({ initialVods: mockInitialVods }),
		);

		// Act
		await act(async () => {
			await result.current.handleTogglePublish(
				mockInitialVods[1] as AdminVodItem,
				true,
			);
		});

		// Assert
		expect(result.current.vods[1]?.isPublished).toBe(true);
	});

	it("handles bulk publish with succeeded items and removes from selectedIds", async () => {
		// Arrange
		vi.mocked(bulkPublishVods).mockResolvedValueOnce({
			data: {
				failed: [],
				succeeded: ["vod_2"],
			},
			success: true,
		});
		const { result } = renderHook(() =>
			useAdminContentState({ initialVods: mockInitialVods }),
		);

		// Act: select vod_2 then bulk publish
		act(() => {
			result.current.setSelectedIds(["vod_2"]);
		});
		await act(async () => {
			await result.current.handleBulkPublish(["vod_2"]);
		});

		// Assert
		expect(result.current.vods[1]?.isPublished).toBe(true);
		expect(result.current.selectedIds).toEqual([]);
	});

	it("handles bulk delete with succeeded items and removes from selectedIds", async () => {
		// Arrange
		vi.mocked(bulkDeleteVods).mockResolvedValueOnce({
			data: {
				failed: [],
				succeeded: ["vod_1"],
			},
			success: true,
		});
		const { result } = renderHook(() =>
			useAdminContentState({ initialVods: mockInitialVods }),
		);

		// Act: select both then bulk delete
		act(() => {
			result.current.setSelectedIds(["vod_1", "vod_2"]);
			result.current.handleOpenBulkDelete(["vod_1", "vod_2"]);
		});
		await act(async () => {
			await result.current.handleConfirmDelete();
		});

		// Assert
		expect(result.current.vods).toHaveLength(1);
		expect(result.current.selectedIds).toEqual(["vod_2"]);
	});

	it("handles single delete and removes from selectedIds", async () => {
		// Arrange
		vi.mocked(deleteVod).mockResolvedValueOnce({
			data: null,
			success: true,
		});
		const { result } = renderHook(() =>
			useAdminContentState({ initialVods: mockInitialVods }),
		);

		// Act: select vod_1 and single delete
		act(() => {
			result.current.setSelectedIds(["vod_1"]);
			result.current.handleOpenSingleDelete(mockInitialVods[0] as AdminVodItem);
		});
		await act(async () => {
			await result.current.handleConfirmDelete();
		});

		// Assert
		expect(result.current.vods).toHaveLength(1);
		expect(result.current.selectedIds).toEqual([]);
	});

	it("handles bulk publish error response", async () => {
		// Arrange
		vi.mocked(bulkPublishVods).mockResolvedValueOnce({
			error: "Bulk publish rejected",
			success: false,
		});
		const { result } = renderHook(() =>
			useAdminContentState({ initialVods: mockInitialVods }),
		);

		// Act
		await act(async () => {
			await result.current.handleBulkPublish(["vod_1"]);
		});

		// Assert
		expect(result.current.error).toBe("Bulk publish rejected");
	});

	it("handles bulk delete error response", async () => {
		// Arrange
		vi.mocked(bulkDeleteVods).mockResolvedValueOnce({
			error: "Bulk delete rejected",
			success: false,
		});
		const { result } = renderHook(() =>
			useAdminContentState({ initialVods: mockInitialVods }),
		);

		// Act
		act(() => {
			result.current.handleOpenBulkDelete(["vod_1", "vod_2"]);
		});
		await act(async () => {
			await result.current.handleConfirmDelete();
		});

		// Assert
		expect(result.current.error).toBe("Bulk delete rejected");
	});
});
