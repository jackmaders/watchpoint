import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { scenarios, vods } from "@/shared/db";
import {
	createScenario,
	createVod,
	deleteScenario,
	deleteVod,
	reorderScenarios,
	setVodPublicationStatus,
	updateScenario,
	updateVod,
} from "../../api/server-fns";
import {
	runMutation,
	swapScenarios,
	useScenarioMutations,
	useVodMutations,
} from "../use-admin-vod-editor";

vi.mock("@tanstack/react-router");
vi.mock("../../api/server-fns");

describe("use-admin-vod-editor hooks and utilities", () => {
	const mockVod: typeof vods.$inferSelect = {
		createdAt: new Date("2026-08-20T00:00:00Z"),
		durationSeconds: 600,
		heroName: "Ana",
		id: "vod_1",
		isPublished: false,
		mapName: "King's Row",
		rankTier: "Grandmaster",
		role: "SUPPORT",
		title: "GM Ana",
		youtubeVideoId: "yt_1",
	};

	const mockScenarios: Array<typeof scenarios.$inferSelect> = [
		{
			explanationText: "Explanation 1",
			id: "s1",
			imageUrl: null,
			inputConfig: {},
			inputType: "MULTIPLE_CHOICE",
			moduleType: "STRATEGY",
			promptText: "Prompt 1",
			timeLimitSeconds: null,
			timestampSeconds: 10,
			vodId: "vod_1",
		},
		{
			explanationText: "Explanation 2",
			id: "s2",
			imageUrl: null,
			inputConfig: {},
			inputType: "TIME_SLIDER",
			moduleType: "COOLDOWN",
			promptText: "Prompt 2",
			timeLimitSeconds: null,
			timestampSeconds: 50,
			vodId: "vod_1",
		},
	];

	describe("swapScenarios", () => {
		it("returns null if scenario not found or moving out of bounds", () => {
			// Arrange & Act & Assert
			expect(swapScenarios(mockScenarios, "nonexistent", "up")).toBeNull();
			expect(swapScenarios(mockScenarios, "s1", "up")).toBeNull();
			expect(swapScenarios(mockScenarios, "s2", "down")).toBeNull();
		});

		it("swaps timestamps between adjacent scenarios correctly in a multi-item list", () => {
			// Arrange
			const threeScenarios: Array<typeof scenarios.$inferSelect> = [
				...mockScenarios,
				{
					explanationText: "Explanation 3",
					id: "s3",
					imageUrl: null,
					inputConfig: {},
					inputType: "PERCENT_SLIDER",
					moduleType: "ULTIMATE",
					promptText: "Prompt 3",
					timeLimitSeconds: null,
					timestampSeconds: 100,
					vodId: "vod_1",
				},
			];

			// Act
			const swapped = swapScenarios(threeScenarios, "s2", "up");

			// Assert
			expect(swapped).not.toBeNull();
			const s1 = swapped?.find((s) => s.id === "s1");
			const s2 = swapped?.find((s) => s.id === "s2");
			const s3 = swapped?.find((s) => s.id === "s3");
			expect(s1?.timestampSeconds).toBe(50);
			expect(s2?.timestampSeconds).toBe(10);
			expect(s3?.timestampSeconds).toBe(100);
		});
	});

	describe("runMutation", () => {
		it("calls runner, onSuccess, and manages clearAlerts / setIsSubmitting", async () => {
			// Arrange
			const clearAlerts = vi.fn();
			const setError = vi.fn();
			const setIsSubmitting = vi.fn();
			const onSuccess = vi.fn();
			const state = { clearAlerts, setError, setIsSubmitting };

			// Act
			await runMutation(
				async () => ({ data: "success" }),
				onSuccess,
				state,
				"Fallback Error",
			);

			// Assert
			expect(clearAlerts).toHaveBeenCalled();
			expect(setIsSubmitting).toHaveBeenCalledWith(true);
			expect(setIsSubmitting).toHaveBeenCalledWith(false);
			expect(onSuccess).toHaveBeenCalledWith({ data: "success" });
			expect(setError).not.toHaveBeenCalled();
		});

		it("handles thrown Error and sets error message", async () => {
			// Arrange
			const clearAlerts = vi.fn();
			const setError = vi.fn();
			const setIsSubmitting = vi.fn();
			const onSuccess = vi.fn();
			const state = { clearAlerts, setError, setIsSubmitting };

			// Act
			await runMutation(
				async () => {
					throw new Error("Custom error message");
				},
				onSuccess,
				state,
				"Fallback Error",
			);

			// Assert
			expect(setError).toHaveBeenCalledWith("Custom error message");
			expect(setIsSubmitting).toHaveBeenCalledWith(false);
		});

		it("handles non-Error thrown objects and uses fallback error", async () => {
			// Arrange
			const clearAlerts = vi.fn();
			const setError = vi.fn();
			const setIsSubmitting = vi.fn();
			const onSuccess = vi.fn();
			const state = { clearAlerts, setError, setIsSubmitting };

			// Act
			await runMutation(
				async () => {
					throw "non-error";
				},
				onSuccess,
				state,
				"Fallback Error",
			);

			// Assert
			expect(setError).toHaveBeenCalledWith("Fallback Error");
		});
	});

	describe("useVodMutations", () => {
		it("handles createVod, updateVod, deleteVod, and setVodPublicationStatus", async () => {
			// Arrange
			vi.mocked(createVod).mockResolvedValueOnce({
				data: mockVod as never,
				success: true,
			});
			vi.mocked(updateVod).mockResolvedValueOnce({
				data: { ...mockVod, title: "Updated GM Ana" } as never,
				success: true,
			});
			vi.mocked(setVodPublicationStatus).mockResolvedValueOnce({
				data: { ...mockVod, isPublished: true } as never,
				success: true,
			});
			vi.mocked(deleteVod).mockResolvedValueOnce({
				data: null,
				success: true,
			});

			const { result } = renderHook(() => useVodMutations(mockVod));

			// Act: create
			await act(async () => {
				await result.current.handleCreateVod({
					durationSeconds: 600,
					heroName: "Ana",
					mapName: "King's Row",
					rankTier: "Grandmaster",
					role: "SUPPORT",
					title: "GM Ana",
					youtubeVideoId: "yt_1",
				});
			});
			expect(result.current.success).toBe("VOD created successfully!");

			// Act: update metadata
			await act(async () => {
				await result.current.handleUpdateVodMetadata({
					durationSeconds: 600,
					heroName: "Ana",
					mapName: "King's Row",
					rankTier: "Grandmaster",
					role: "SUPPORT",
					title: "Updated GM Ana",
					youtubeVideoId: "yt_1",
				});
			});
			expect(result.current.success).toBe("VOD metadata saved successfully!");

			// Act: toggle publish true
			await act(async () => {
				await result.current.handleTogglePublish(true);
			});
			expect(result.current.success).toBe("VOD published!");

			// Act: toggle publish false
			vi.mocked(setVodPublicationStatus).mockResolvedValueOnce({
				data: { ...mockVod, isPublished: false } as never,
				success: true,
			});
			await act(async () => {
				await result.current.handleTogglePublish(false);
			});
			expect(result.current.success).toBe("VOD set to draft.");

			// Act: delete
			await act(async () => {
				await result.current.handleDeleteVod();
			});

			// Act: create failure without error field
			vi.mocked(createVod).mockResolvedValueOnce({
				error: "Failed to create VOD",
				success: false,
			});
			await act(async () => {
				await result.current.handleCreateVod({
					durationSeconds: 600,
					heroName: "Ana",
					mapName: "King's Row",
					rankTier: "Grandmaster",
					role: "SUPPORT",
					title: "GM Ana",
					youtubeVideoId: "yt_1",
				});
			});
			expect(result.current.error).toBe("Failed to create VOD");

			// Act: update failure without error field
			vi.mocked(updateVod).mockResolvedValueOnce({
				error: "Failed to update VOD metadata",
				success: false,
			});
			await act(async () => {
				await result.current.handleUpdateVodMetadata({
					durationSeconds: 600,
					heroName: "Ana",
					mapName: "King's Row",
					rankTier: "Grandmaster",
					role: "SUPPORT",
					title: "GM Ana",
					youtubeVideoId: "yt_1",
				});
			});
			expect(result.current.error).toBe("Failed to update VOD metadata");

			// Act: toggle publish failure without error field
			vi.mocked(setVodPublicationStatus).mockResolvedValueOnce({
				error: "Failed to update publication status",
				success: false,
			});
			await act(async () => {
				await result.current.handleTogglePublish(true);
			});
			expect(result.current.error).toBe("Failed to update publication status");

			// Act: delete failure without error field
			vi.mocked(deleteVod).mockResolvedValueOnce({
				error: "Failed to delete VOD",
				success: false,
			});
			await act(async () => {
				await result.current.handleDeleteVod();
			});
			expect(result.current.error).toBe("Failed to delete VOD");
		});

		it("handles no-op calls when vod is null", async () => {
			// Arrange
			const { result } = renderHook(() => useVodMutations(null));

			// Act: update on null vod
			await act(async () => {
				await result.current.handleUpdateVodMetadata({
					durationSeconds: 600,
					heroName: "Ana",
					mapName: "King's Row",
					rankTier: "Grandmaster",
					role: "SUPPORT",
					title: "Updated",
					youtubeVideoId: "yt_1",
				});
			});

			// Act: delete on null vod
			await act(async () => {
				await result.current.handleDeleteVod();
			});

			// Act: toggle publish on null vod
			await act(async () => {
				await result.current.handleTogglePublish(true);
			});

			// Assert
			expect(updateVod).not.toHaveBeenCalled();
			expect(deleteVod).not.toHaveBeenCalled();
			expect(setVodPublicationStatus).not.toHaveBeenCalled();
		});
	});

	describe("useScenarioMutations", () => {
		it("handles scenario create and update and error branches", async () => {
			// Arrange
			const clearAlerts = vi.fn();
			const setError = vi.fn();
			const setIsSubmitting = vi.fn();
			const setSuccess = vi.fn();
			const state = { clearAlerts, setError, setIsSubmitting, setSuccess };

			vi.mocked(createScenario).mockResolvedValueOnce({
				data: mockScenarios[0] as never,
				success: true,
			});
			vi.mocked(updateScenario).mockResolvedValueOnce({
				data: {
					...mockScenarios[0],
					promptText: "Updated Prompt",
				} as never,
				success: true,
			});
			vi.mocked(createScenario).mockResolvedValueOnce({
				error: "Failed to create",
				success: false,
			});

			const { result } = renderHook(() =>
				useScenarioMutations(mockScenarios, "vod_1", state),
			);

			// Act: create scenario
			await act(async () => {
				await result.current.handleSaveScenario({
					explanationText: "Exp",
					inputConfig: {},
					inputType: "MULTIPLE_CHOICE",
					moduleType: "STRATEGY",
					promptText: "New Prompt",
					timestampSeconds: 10,
					vodId: "vod_1",
				});
			});
			expect(setSuccess).toHaveBeenCalledWith("Scenario created!");

			// Act: update scenario
			await act(async () => {
				await result.current.handleSaveScenario({
					explanationText: "Exp",
					id: "s1",
					inputConfig: {},
					inputType: "MULTIPLE_CHOICE",
					moduleType: "STRATEGY",
					promptText: "Updated Prompt",
					timestampSeconds: 10,
					vodId: "vod_1",
				});
			});
			expect(setSuccess).toHaveBeenCalledWith("Scenario updated!");

			// Act: save error
			await act(async () => {
				await result.current.handleSaveScenario({
					explanationText: "Exp",
					inputConfig: {},
					inputType: "MULTIPLE_CHOICE",
					moduleType: "STRATEGY",
					promptText: "New Prompt 2",
					timestampSeconds: 20,
					vodId: "vod_1",
				});
			});
			expect(setError).toHaveBeenCalledWith("Failed to create");

			// Act: save error without error field
			vi.mocked(createScenario).mockResolvedValueOnce({
				error: "Failed to save scenario",
				success: false,
			});
			await act(async () => {
				await result.current.handleSaveScenario({
					explanationText: "Exp",
					inputConfig: {},
					inputType: "MULTIPLE_CHOICE",
					moduleType: "STRATEGY",
					promptText: "New Prompt 3",
					timestampSeconds: 30,
					vodId: "vod_1",
				});
			});
			expect(setError).toHaveBeenCalledWith("Failed to save scenario");
		});

		it("handles scenario delete success and failure", async () => {
			// Arrange
			const clearAlerts = vi.fn();
			const setError = vi.fn();
			const setIsSubmitting = vi.fn();
			const setSuccess = vi.fn();
			const state = { clearAlerts, setError, setIsSubmitting, setSuccess };

			vi.mocked(deleteScenario).mockResolvedValueOnce({
				data: null,
				success: true,
			});
			vi.mocked(deleteScenario).mockResolvedValueOnce({
				error: "Cannot delete scenario",
				success: false,
			});
			vi.mocked(deleteScenario).mockResolvedValueOnce({
				error: "Failed to delete scenario",
				success: false,
			});

			const { result } = renderHook(() =>
				useScenarioMutations(mockScenarios, "vod_1", state),
			);

			// Act: select scenario
			act(() => {
				result.current.setSelectedScenario(mockScenarios[0] ?? null);
			});

			// Act: delete scenario
			await act(async () => {
				await result.current.handleDeleteScenario("s1");
			});
			expect(setSuccess).toHaveBeenCalledWith("Scenario deleted.");
			expect(result.current.selectedScenario).toBeNull();

			// Act: delete failure
			await act(async () => {
				await result.current.handleDeleteScenario("s2");
			});
			expect(setError).toHaveBeenCalledWith("Cannot delete scenario");

			// Act: delete failure without error field
			await act(async () => {
				await result.current.handleDeleteScenario("s2");
			});
			expect(setError).toHaveBeenCalledWith("Failed to delete scenario");
		});

		it("handles scenario reorder success", async () => {
			// Arrange
			const clearAlerts = vi.fn();
			const setError = vi.fn();
			const setIsSubmitting = vi.fn();
			const setSuccess = vi.fn();
			const state = { clearAlerts, setError, setIsSubmitting, setSuccess };

			vi.mocked(reorderScenarios).mockResolvedValueOnce({
				data: null,
				success: true,
			});

			const { result } = renderHook(() =>
				useScenarioMutations(mockScenarios, "vod_1", state),
			);

			// Act: reorder scenario success
			await act(async () => {
				await result.current.handleMoveScenario("s2", "up");
			});
			expect(reorderScenarios).toHaveBeenCalled();
		});

		it("handles scenario reorder API failure and fallback message", async () => {
			// Arrange
			const clearAlerts = vi.fn();
			const setError = vi.fn();
			const setIsSubmitting = vi.fn();
			const setSuccess = vi.fn();
			const state = { clearAlerts, setError, setIsSubmitting, setSuccess };

			vi.mocked(reorderScenarios).mockResolvedValueOnce({
				error: "Failed to reorder",
				success: false,
			});
			vi.mocked(reorderScenarios).mockResolvedValueOnce({
				error: "Failed to reorder scenarios",
				success: false,
			});

			const { result } = renderHook(() =>
				useScenarioMutations(mockScenarios, "vod_1", state),
			);

			// Act: reorder failure with error
			await act(async () => {
				await result.current.handleMoveScenario("s2", "up");
			});
			expect(setError).toHaveBeenCalledWith("Failed to reorder");

			// Act: reorder failure without error
			await act(async () => {
				await result.current.handleMoveScenario("s2", "down");
			});
			expect(setError).toHaveBeenCalledWith("Failed to reorder scenarios");

			// Act: unswappable move (move top item s1 up)
			await act(async () => {
				await result.current.handleMoveScenario("s1", "up");
			});
		});

		it("handles no-op reorder when vodId is undefined", async () => {
			// Arrange
			const state = {
				clearAlerts: vi.fn(),
				setError: vi.fn(),
				setIsSubmitting: vi.fn(),
				setSuccess: vi.fn(),
			};
			const { result } = renderHook(() =>
				useScenarioMutations(mockScenarios, undefined, state),
			);

			// Act
			await act(async () => {
				await result.current.handleMoveScenario("s2", "up");
			});

			// Assert
			expect(reorderScenarios).not.toHaveBeenCalled();
		});
	});
});
