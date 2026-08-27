import { beforeEach, describe, expect, it, vi } from "vitest";
import { playthroughService } from "@/shared/db";
import { getCurrentUser } from "@/shared/lib/auth";
import {
	completePlaythroughAction,
	startPlaythroughAction,
} from "../playthrough";

vi.mock("@/shared/db");
vi.mock("@/shared/lib/auth");

const input = {
	id: "playthrough_1",
	modules: ["STRATEGY"] as const,
	scenarios: [],
	vodId: "vod_1",
};

describe("playthrough persistence actions", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(getCurrentUser).mockResolvedValue({ id: "user_1" });
	});

	it("rejects anonymous playthrough initialization", async () => {
		// Arrange
		vi.mocked(getCurrentUser).mockResolvedValueOnce(null);

		// Act
		const result = await startPlaythroughAction(input);

		// Assert
		expect(result).toEqual({
			error: "Authentication required",
			success: false,
		});
	});

	it("creates an owned playthrough and returns snapshot identities", async () => {
		// Arrange
		vi.mocked(playthroughService.create).mockResolvedValueOnce({
			data: { id: "playthrough_1" } as never,
			success: true,
		});

		// Act
		const result = await startPlaythroughAction({
			...input,
			scenarios: [
				{ id: "snapshot_1", scenarioId: "scenario_1" } as never,
				{ scenarioId: "scenario_2" } as never,
			],
		});

		// Assert
		expect(result).toEqual({
			playthrough: { id: "playthrough_1" },
			scenarioSnapshotIds: ["snapshot_1", "scenario_2"],
			success: true,
		});
		expect(playthroughService.create).toHaveBeenCalledWith(
			expect.objectContaining({ userId: "user_1" }),
			undefined,
		);
	});

	it("returns a stable conflict for a duplicate start identity", async () => {
		// Arrange
		vi.mocked(playthroughService.create).mockResolvedValueOnce({
			error: "Playthrough start conflict",
			success: false,
		});

		// Act
		const result = await startPlaythroughAction(input);

		// Assert
		expect(result).toEqual({
			error: "Playthrough start conflict",
			success: false,
		});
	});

	it("returns generic error when createPlaythrough returns generic error", async () => {
		// Arrange
		vi.mocked(playthroughService.create).mockResolvedValueOnce({
			error: "Some DB error",
			success: false,
		});

		// Act
		const result = await startPlaythroughAction(input);

		// Assert
		expect(result).toEqual({
			error:
				"We couldn’t save your progress. Your training session can continue.",
			success: false,
		});
	});

	it("returns a generic failure for an unexpected start error", async () => {
		// Arrange
		vi.mocked(playthroughService.create).mockRejectedValueOnce(
			new Error("D1 offline"),
		);

		// Act
		const result = await startPlaythroughAction(input);

		// Assert
		expect(result).toEqual({
			error:
				"We couldn’t save your progress. Your training session can continue.",
			success: false,
		});
	});

	it("rejects anonymous completion", async () => {
		// Arrange
		vi.mocked(getCurrentUser).mockResolvedValueOnce(null);

		// Act
		const result = await completePlaythroughAction("playthrough_1");

		// Assert
		expect(result).toEqual({
			error: "Authentication required",
			success: false,
		});
	});

	it("completes an owned playthrough", async () => {
		// Arrange
		vi.mocked(playthroughService.complete).mockResolvedValueOnce({
			data: { id: "completion_1" } as never,
			success: true,
		});

		// Act
		const result = await completePlaythroughAction("playthrough_1");

		// Assert
		expect(result).toEqual({
			completion: { id: "completion_1" },
			success: true,
		});
	});

	it("returns a safe failure for a missing playthrough", async () => {
		// Arrange
		vi.mocked(playthroughService.complete).mockResolvedValueOnce({
			data: null,
			success: true,
		});

		// Act
		const result = await completePlaythroughAction("missing");

		// Assert
		expect(result).toEqual({ error: "Playthrough not found", success: false });
	});

	it("returns a generic failure when completion persistence throws", async () => {
		// Arrange
		vi.mocked(playthroughService.complete).mockRejectedValueOnce(
			new Error("D1 offline"),
		);

		// Act
		const result = await completePlaythroughAction("playthrough_1");

		// Assert
		expect(result).toEqual({
			error:
				"We couldn’t save your progress. Your training session can continue.",
			success: false,
		});
	});

	it("returns failure when completePlaythrough returns success: false", async () => {
		// Arrange
		vi.mocked(playthroughService.complete).mockResolvedValueOnce({
			error: "DB error",
			success: false,
		});

		// Act
		const result = await completePlaythroughAction("playthrough_1");

		// Assert
		expect(result).toEqual({
			error:
				"We couldn’t save your progress. Your training session can continue.",
			success: false,
		});
	});
});
