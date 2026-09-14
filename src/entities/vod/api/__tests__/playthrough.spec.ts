import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	createDbClient,
	createPlaythrough,
	createPlaythroughCompletion,
	createPlaythroughModuleSelections,
	createScenarioSnapshots,
	getPlaythroughById,
	updatePlaythrough,
} from "@/shared/db";
import { getCurrentUser } from "@/shared/lib/auth";
import {
	completePlaythroughAction,
	startPlaythroughAction,
} from "../playthrough";

vi.mock("@/shared/db");
vi.mock("@/shared/lib/auth");

const input: import("../playthrough").StartPlaythroughInput = {
	id: "playthrough_1",
	modules: ["STRATEGY"],
	scenarios: [],
	vodId: "vod_1",
};

describe("playthrough persistence actions", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(createDbClient).mockReturnValue({} as never);
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
		vi.mocked(createPlaythrough).mockResolvedValueOnce({
			id: "playthrough_1",
		} as never);
		vi.mocked(createPlaythroughModuleSelections).mockResolvedValueOnce(
			[] as never,
		);
		vi.mocked(createScenarioSnapshots).mockResolvedValueOnce([] as never);

		// Act
		const result = await startPlaythroughAction({
			...input,
			scenarios: [
				{
					explanationText: "exp",
					id: "snapshot_1",
					inputConfig: {},
					inputType: "MULTIPLE_CHOICE",
					moduleType: "STRATEGY",
					promptText: "prompt",
					scenarioId: "scenario_1",
					timestampSeconds: 10,
				},
				{
					explanationText: "exp2",
					inputConfig: {},
					inputType: "MULTIPLE_CHOICE",
					moduleType: "STRATEGY",
					promptText: "prompt2",
					scenarioId: "scenario_2",
					timestampSeconds: 20,
				},
			],
		});

		// Assert
		expect(result).toEqual({
			playthrough: { id: "playthrough_1" },
			scenarioSnapshotIds: ["snapshot_1", "scenario_2"],
			success: true,
		});
		expect(createPlaythrough).toHaveBeenCalledWith(
			expect.objectContaining({ userId: "user_1" }),
			expect.anything(),
		);
	});

	it("returns a stable conflict for a duplicate start identity", async () => {
		// Arrange
		vi.mocked(createPlaythrough).mockRejectedValueOnce(
			new Error("Playthrough start conflict"),
		);

		// Act
		const result = await startPlaythroughAction(input);

		// Assert
		expect(result).toEqual({
			error: "Playthrough start conflict",
			success: false,
		});
	});

	it("returns a generic failure for an unexpected start error", async () => {
		// Arrange
		vi.mocked(createPlaythrough).mockRejectedValueOnce(new Error("D1 offline"));

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
		vi.mocked(getPlaythroughById).mockResolvedValueOnce({
			id: "playthrough_1",
			userId: "user_1",
		} as never);
		vi.mocked(updatePlaythrough).mockResolvedValueOnce({
			id: "playthrough_1",
		} as never);
		vi.mocked(createPlaythroughCompletion).mockResolvedValueOnce({
			id: "completion_1",
		} as never);

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
		vi.mocked(getPlaythroughById).mockResolvedValueOnce(undefined as never);

		// Act
		const result = await completePlaythroughAction("missing");

		// Assert
		expect(result).toEqual({ error: "Playthrough not found", success: false });
	});

	it("returns a generic failure when completion persistence throws", async () => {
		// Arrange
		vi.mocked(getPlaythroughById).mockRejectedValueOnce(
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

	it("returns failure when createPlaythrough returns null", async () => {
		// Arrange
		vi.mocked(createPlaythrough).mockResolvedValueOnce(null as never);

		// Act
		const result = await startPlaythroughAction(input);

		// Assert
		expect(result).toEqual({
			error:
				"We couldn’t save your progress. Your training session can continue.",
			success: false,
		});
	});

	it("creates playthrough without input.id and handles non-Error start failures", async () => {
		// Arrange
		vi.mocked(createPlaythrough).mockResolvedValueOnce({
			id: "gen_id",
		} as never);

		// Act
		const result = await startPlaythroughAction({
			modules: [],
			scenarios: [],
			vodId: "vod_1",
		});

		// Assert
		expect(result).toEqual({
			playthrough: { id: "gen_id" },
			scenarioSnapshotIds: [],
			success: true,
		});
		expect(createPlaythrough).toHaveBeenCalledWith(
			{ userId: "user_1", vodId: "vod_1" },
			expect.anything(),
		);

		// Non-Error exception
		vi.mocked(createPlaythrough).mockRejectedValueOnce("String error");
		const failResult = await startPlaythroughAction({
			modules: [],
			scenarios: [],
			vodId: "vod_1",
		});
		expect(failResult).toEqual({
			error:
				"We couldn’t save your progress. Your training session can continue.",
			success: false,
		});
	});

	it("returns error when createPlaythroughCompletion returns null", async () => {
		// Arrange
		vi.mocked(getPlaythroughById).mockResolvedValueOnce({
			id: "p_1",
			status: "IN_PROGRESS",
			userId: "user_1",
		} as never);
		vi.mocked(updatePlaythrough).mockResolvedValueOnce({} as never);
		vi.mocked(createPlaythroughCompletion).mockResolvedValueOnce(null as never);

		// Act
		const result = await completePlaythroughAction("p_1");

		// Assert
		expect(result).toEqual({
			error: "Playthrough not found",
			success: false,
		});
	});
});
