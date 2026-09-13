import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
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
import type { ScenarioItem, VodItem } from "../../model";
import {
	runMutation,
	swapScenarios,
	useScenarioMutations,
	useVodMutations,
} from "../use-admin-vod-editor";

vi.mock("@tanstack/react-router");
vi.mock("../../api/server-fns");

describe("use-admin-vod-editor hooks and utilities", () => {
	const mockVod: VodItem = {
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

	const mockScenarios: ScenarioItem[] = [
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
			expect(swapScenarios(mockScenarios, "nonexistent", "up")).toBeNull();
			expect(swapScenarios(mockScenarios, "s1", "up")).toBeNull();
			expect(swapScenarios(mockScenarios, "s2", "down")).toBeNull();
		});

		it("swaps timestamps between adjacent scenarios correctly in a multi-item list", () => {
			const threeScenarios: ScenarioItem[] = [
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

			const swapped = swapScenarios(threeScenarios, "s2", "up");

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
			const clearAlerts = vi.fn();
			const setError = vi.fn();
			const setIsSubmitting = vi.fn();
			const onSuccess = vi.fn();
			const state = { clearAlerts, setError, setIsSubmitting };

			await runMutation(
				async () => ({ status: "success" as const }),
				onSuccess,
				state,
				"Fallback Error",
			);

			expect(clearAlerts).toHaveBeenCalled();
			expect(setIsSubmitting).toHaveBeenCalledWith(true);
			expect(setIsSubmitting).toHaveBeenCalledWith(false);
			expect(onSuccess).toHaveBeenCalledWith({ status: "success" });
			expect(setError).not.toHaveBeenCalled();
		});

		it("handles rejected status and sets error message", async () => {
			const clearAlerts = vi.fn();
			const setError = vi.fn();
			const setIsSubmitting = vi.fn();
			const onSuccess = vi.fn();
			const state = { clearAlerts, setError, setIsSubmitting };

			await runMutation(
				async () => ({
					reason: "Custom error message",
					status: "rejected" as const,
				}),
				onSuccess,
				state,
				"Fallback Error",
			);

			expect(setError).toHaveBeenCalledWith("Custom error message");
			expect(setIsSubmitting).toHaveBeenCalledWith(false);
		});
	});

	describe("useVodMutations", () => {
		it("handles createVod, updateVod, deleteVod, and setVodPublicationStatus", async () => {
			vi.mocked(createVod).mockResolvedValueOnce({
				status: "success",
				vod: mockVod,
			});
			vi.mocked(updateVod).mockResolvedValueOnce({
				status: "success",
				vod: { ...mockVod, title: "Updated GM Ana" },
			});
			vi.mocked(setVodPublicationStatus).mockResolvedValueOnce({
				status: "success",
				vod: { ...mockVod, isPublished: true },
			});
			vi.mocked(deleteVod).mockResolvedValueOnce({
				status: "success",
				vod: mockVod,
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
				status: "success",
				vod: { ...mockVod, isPublished: false },
			});
			await act(async () => {
				await result.current.handleTogglePublish(false);
			});
			expect(result.current.success).toBe("VOD set to draft.");

			// Act: delete
			await act(async () => {
				await result.current.handleDeleteVod();
			});

			// Act: create failure
			vi.mocked(createVod).mockResolvedValueOnce({
				reason: "Failed to create VOD",
				status: "rejected",
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

			// Act: update failure
			vi.mocked(updateVod).mockResolvedValueOnce({
				reason: "Failed to update VOD",
				status: "rejected",
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
			expect(result.current.error).toBe("Failed to update VOD");

			// Act: toggle failure
			vi.mocked(setVodPublicationStatus).mockResolvedValueOnce({
				reason: "Failed to toggle status",
				status: "rejected",
			});
			await act(async () => {
				await result.current.handleTogglePublish(true);
			});
			expect(result.current.error).toBe("Failed to toggle status");

			// Act: delete failure
			vi.mocked(deleteVod).mockResolvedValueOnce({
				reason: "Failed to delete VOD",
				status: "rejected",
			});
			await act(async () => {
				await result.current.handleDeleteVod();
			});
			expect(result.current.error).toBe("Failed to delete VOD");
		});

		it("handles no-op actions when vod is null", async () => {
			const { result } = renderHook(() => useVodMutations(null));

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
			await act(async () => {
				await result.current.handleTogglePublish(true);
			});
			await act(async () => {
				await result.current.handleDeleteVod();
			});

			expect(updateVod).not.toHaveBeenCalled();
			expect(setVodPublicationStatus).not.toHaveBeenCalled();
			expect(deleteVod).not.toHaveBeenCalled();
		});
	});

	describe("useScenarioMutations", () => {
		const state = {
			clearAlerts: vi.fn(),
			setError: vi.fn(),
			setIsSubmitting: vi.fn(),
			setSuccess: vi.fn(),
		};

		it("handles create, update, delete, and reorder scenarios", async () => {
			const { result } = renderHook(() =>
				useScenarioMutations(mockScenarios, "vod_1", state),
			);

			// Act: select scenario
			act(() => {
				result.current.setSelectedScenario(mockScenarios[0] ?? null);
			});
			expect(result.current.selectedScenario).toEqual(mockScenarios[0]);

			// Act: create scenario
			const newScenario: ScenarioItem = {
				explanationText: "Explanation 3",
				id: "s3",
				imageUrl: null,
				inputConfig: {},
				inputType: "PERCENT_SLIDER",
				moduleType: "ULTIMATE",
				promptText: "Prompt 3",
				timeLimitSeconds: null,
				timestampSeconds: 90,
				vodId: "vod_1",
			};
			vi.mocked(createScenario).mockResolvedValueOnce({
				scenario: newScenario,
				status: "success",
			});

			await act(async () => {
				await result.current.handleSaveScenario({
					explanationText: "Explanation 3",
					inputConfig: {},
					inputType: "PERCENT_SLIDER",
					moduleType: "ULTIMATE",
					promptText: "Prompt 3",
					timestampSeconds: 90,
					vodId: "vod_1",
				});
			});
			expect(state.setSuccess).toHaveBeenCalledWith("Scenario created!");
			expect(result.current.scenariosList).toHaveLength(3);

			// Act: update scenario
			const updatedScenario: ScenarioItem = {
				...newScenario,
				promptText: "Updated Prompt 3",
			};
			vi.mocked(updateScenario).mockResolvedValueOnce({
				scenario: updatedScenario,
				status: "success",
			});

			await act(async () => {
				await result.current.handleSaveScenario({
					explanationText: "Explanation 3",
					id: "s3",
					inputConfig: {},
					inputType: "PERCENT_SLIDER",
					moduleType: "ULTIMATE",
					promptText: "Updated Prompt 3",
					timestampSeconds: 90,
					vodId: "vod_1",
				});
			});
			expect(state.setSuccess).toHaveBeenCalledWith("Scenario updated!");

			// Act: delete scenario
			vi.mocked(deleteScenario).mockResolvedValueOnce({
				scenario: updatedScenario,
				status: "success",
			});
			await act(async () => {
				await result.current.handleDeleteScenario("s3");
			});
			expect(state.setSuccess).toHaveBeenCalledWith("Scenario deleted.");
			expect(result.current.scenariosList).toHaveLength(2);

			// Act: delete when selected scenario matches
			act(() => {
				result.current.setSelectedScenario(mockScenarios[0] ?? null);
			});
			vi.mocked(deleteScenario).mockResolvedValueOnce({
				scenario: mockScenarios[0] as ScenarioItem,
				status: "success",
			});
			await act(async () => {
				await result.current.handleDeleteScenario("s1");
			});
			expect(result.current.selectedScenario).toBeNull();

			// Act: reorder scenario
			// First add s3 back so s2 is not the first item (since s1 was deleted, s2 was at index 0)
			vi.mocked(createScenario).mockResolvedValueOnce({
				scenario: newScenario,
				status: "success",
			});
			await act(async () => {
				await result.current.handleSaveScenario({
					explanationText: "Explanation 3",
					inputConfig: {},
					inputType: "PERCENT_SLIDER",
					moduleType: "ULTIMATE",
					promptText: "Prompt 3",
					timestampSeconds: 90,
					vodId: "vod_1",
				});
			});

			vi.mocked(reorderScenarios).mockResolvedValueOnce({
				status: "success",
			});
			await act(async () => {
				await result.current.handleMoveScenario("s3", "up");
			});
			expect(reorderScenarios).toHaveBeenCalled();
		});

		it("handles failure branches for scenario mutations", async () => {
			const { result } = renderHook(() =>
				useScenarioMutations(mockScenarios, "vod_1", state),
			);

			// Act: create failure
			vi.mocked(createScenario).mockResolvedValueOnce({
				reason: "Failed to create",
				status: "rejected",
			});
			await act(async () => {
				await result.current.handleSaveScenario({
					explanationText: "Explanation",
					inputConfig: {},
					inputType: "PERCENT_SLIDER",
					moduleType: "ULTIMATE",
					promptText: "Prompt",
					timestampSeconds: 90,
					vodId: "vod_1",
				});
			});
			expect(state.setError).toHaveBeenCalledWith("Failed to create");

			// Act: create failure with fallback reason
			vi.mocked(createScenario).mockResolvedValueOnce({
				status: "rejected",
			} as never);
			await act(async () => {
				await result.current.handleSaveScenario({
					explanationText: "Explanation",
					inputConfig: {},
					inputType: "PERCENT_SLIDER",
					moduleType: "ULTIMATE",
					promptText: "Prompt",
					timestampSeconds: 90,
					vodId: "vod_1",
				});
			});
			expect(state.setError).toHaveBeenCalledWith("Unable to save scenario.");

			// Act: delete failure
			vi.mocked(deleteScenario).mockResolvedValueOnce({
				reason: "Failed to delete",
				status: "rejected",
			});
			await act(async () => {
				await result.current.handleDeleteScenario("s1");
			});
			expect(state.setError).toHaveBeenCalledWith("Failed to delete");

			// Act: reorder failure
			vi.mocked(reorderScenarios).mockResolvedValueOnce({
				reason: "Failed to reorder",
				status: "rejected",
			});
			await act(async () => {
				await result.current.handleMoveScenario("s2", "up");
			});
			expect(state.setError).toHaveBeenCalledWith("Failed to reorder");

			// Act: reorder failure with fallback reason
			vi.mocked(reorderScenarios).mockResolvedValueOnce({
				status: "rejected",
			} as never);
			await act(async () => {
				await result.current.handleMoveScenario("s1", "up");
			});
			expect(state.setError).toHaveBeenCalledWith(
				"Failed to reorder scenarios",
			);
		});

		it("handles no-op reorder when vodId is undefined", async () => {
			const { result } = renderHook(() =>
				useScenarioMutations(mockScenarios, undefined, state),
			);

			await act(async () => {
				await result.current.handleMoveScenario("s1", "up");
			});
			expect(reorderScenarios).not.toHaveBeenCalled();
		});
	});
});
