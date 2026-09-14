/**
 * Tests loaders and query options for session manifest and playthrough initialization.
 *
 * Verifies cache warming with staleTime static, empty manifest handling, queryFn execution, and snapshot generation.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/entities/vod");

import {
	getProtectedSessionManifest,
	normalizeSessionManifestModules,
	startPlaythroughAction,
} from "@/entities/vod";
import {
	loadVodsIdSessionPage,
	sessionPlaythroughQueryOptions,
} from "../loaders";

describe("vods-id-session loaders", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("sessionPlaythroughQueryOptions", () => {
		it("creates query options with vodId and modules", () => {
			// Act
			const options = sessionPlaythroughQueryOptions("vod_1", "STRATEGY");

			// Assert
			expect(options.queryKey).toEqual([
				"session-playthrough",
				"vod_1",
				"STRATEGY",
			]);
		});

		it("creates query options without modules", () => {
			// Act
			const options = sessionPlaythroughQueryOptions("vod_1");

			// Assert
			expect(options.queryKey).toEqual(["session-playthrough", "vod_1", ""]);
		});

		it("executes queryFn delegating to getProtectedSessionManifest", async () => {
			// Arrange
			const mockVod = { id: "vod_1" };
			vi.mocked(getProtectedSessionManifest).mockResolvedValueOnce(
				mockVod as never,
			);
			const options = sessionPlaythroughQueryOptions("vod_1", "STRATEGY");

			// Act
			const result = await (options.queryFn as () => Promise<unknown>)();

			// Assert
			expect(getProtectedSessionManifest).toHaveBeenCalledWith({
				data: {
					modules: "STRATEGY",
					vodId: "vod_1",
				},
			});
			expect(result).toBe(mockVod);
		});
	});

	describe("loadVodsIdSessionPage", () => {
		it("returns empty result when protected manifest is not found", async () => {
			// Arrange
			vi.mocked(getProtectedSessionManifest).mockResolvedValueOnce(
				null as never,
			);

			// Act
			const result = await loadVodsIdSessionPage({
				deps: { modules: "STRATEGY" },
				params: { id: "vod_1" },
			});

			// Assert
			expect(result).toEqual({
				playthroughId: null,
				scenarioSnapshotIds: [],
				vod: null,
			});
		});

		it("warms cache when context queryClient is provided", async () => {
			// Arrange
			const mockQuery = vi.fn().mockResolvedValueOnce(undefined);
			const mockContext = {
				queryClient: {
					query: mockQuery,
				} as never,
			};
			vi.mocked(getProtectedSessionManifest).mockResolvedValueOnce(
				null as never,
			);

			// Act
			await loadVodsIdSessionPage({
				context: mockContext,
				deps: { modules: "STRATEGY" },
				params: { id: "vod_1" },
			});

			// Assert
			expect(mockQuery).toHaveBeenCalledWith(
				expect.objectContaining({
					staleTime: "static",
				}),
			);
		});

		it("initializes playthrough and returns snapshot IDs on successful manifest load", async () => {
			// Arrange
			const mockVod = {
				id: "vod_1",
				scenarios: [
					{
						explanationText: "Explanation",
						id: "sc_1",
						imageUrl: null,
						inputConfig: {},
						inputType: "MULTIPLE_CHOICE",
						moduleType: "STRATEGY",
						promptText: "Prompt",
						timeLimitSeconds: 10,
						timestampSeconds: 15,
					},
				],
			};
			vi.mocked(getProtectedSessionManifest).mockResolvedValueOnce(
				mockVod as never,
			);
			vi.mocked(normalizeSessionManifestModules).mockReturnValueOnce([
				"STRATEGY",
			]);
			vi.mocked(startPlaythroughAction).mockResolvedValueOnce({
				playthrough: { id: "pt_1" } as never,
				scenarioSnapshotIds: ["snap_1"],
				success: true,
			});

			// Act
			const result = await loadVodsIdSessionPage({
				deps: { modules: "STRATEGY", playthroughId: "pt_1" },
				params: { id: "vod_1" },
			});

			// Assert
			expect(startPlaythroughAction).toHaveBeenCalled();
			expect(result).toEqual({
				playthroughId: "pt_1",
				scenarioSnapshotIds: ["snap_1"],
				vod: mockVod,
			});
		});

		it("initializes playthrough with default generated ID and fallback modules when omitted", async () => {
			// Arrange
			const mockVod = {
				id: "vod_1",
				scenarios: [],
			};
			vi.mocked(getProtectedSessionManifest).mockResolvedValueOnce(
				mockVod as never,
			);
			vi.mocked(normalizeSessionManifestModules).mockReturnValueOnce(undefined);
			vi.mocked(startPlaythroughAction).mockResolvedValueOnce({
				playthrough: { id: "generated_id" } as never,
				scenarioSnapshotIds: [],
				success: true,
			});

			// Act
			const result = await loadVodsIdSessionPage({
				deps: {},
				params: { id: "vod_1" },
			});

			// Assert
			expect(startPlaythroughAction).toHaveBeenCalledWith(
				expect.objectContaining({
					modules: [],
				}),
			);
			expect(result).toEqual({
				playthroughId: "generated_id",
				scenarioSnapshotIds: [],
				vod: mockVod,
			});
		});

		it("throws error when playthrough creation fails", async () => {
			// Arrange
			const mockVod = {
				id: "vod_1",
				scenarios: [],
			};
			vi.mocked(getProtectedSessionManifest).mockResolvedValueOnce(
				mockVod as never,
			);
			vi.mocked(normalizeSessionManifestModules).mockReturnValueOnce(undefined);
			vi.mocked(startPlaythroughAction).mockResolvedValueOnce({
				error: "Failed to create playthrough",
				success: false,
			});

			// Act & Assert
			await expect(
				loadVodsIdSessionPage({
					deps: {},
					params: { id: "vod_1" },
				}),
			).rejects.toThrow("Failed to create playthrough");
		});
	});
});
