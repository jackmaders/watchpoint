import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/entities/vod");

import {
	getProtectedSessionManifest,
	normalizeSessionManifestModules,
	startPlaythroughAction,
} from "@/entities/vod";
import { loadVodsIdSessionPage } from "../loaders";

describe("vods-id-session loaders", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("returns empty result when protected manifest is not found", async () => {
		// Arrange
		vi.mocked(getProtectedSessionManifest).mockResolvedValueOnce(null as never);

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
