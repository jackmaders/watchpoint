import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	createDbClient,
	getPlaythroughById,
	queryAttemptRecords,
	queryPlaythroughs,
} from "@/shared/db";
import { getCurrentUser } from "@/shared/lib/auth";
import {
	completeOwnedPlaythrough,
	createOwnedPlaythrough,
	getOwnedPlayerHistory,
	getOwnedPlaythrough,
	getOwnedPlaythroughAttempts,
} from "../owned-playthroughs";
import * as playthroughActions from "../playthrough";

vi.mock("@/shared/db");
vi.mock("@/shared/lib/auth");

describe("owned playthrough server boundary", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(createDbClient).mockReturnValue({} as never);
	});

	it("rejects anonymous playthrough reads without querying the repository", async () => {
		// Arrange
		vi.mocked(getCurrentUser).mockResolvedValueOnce(null);

		// Act & Assert
		await expect(getOwnedPlaythrough("other_run")).rejects.toThrow(
			"Authentication required",
		);
		expect(getPlaythroughById).not.toHaveBeenCalled();
	});

	it("uses the authenticated user for playthrough reads", async () => {
		// Arrange
		vi.mocked(getCurrentUser).mockResolvedValueOnce({ id: "owner_1" });
		vi.mocked(getPlaythroughById).mockResolvedValueOnce({
			id: "run_1",
			userId: "owner_1",
		} as never);

		// Act
		const result = await getOwnedPlaythrough("run_1");

		// Assert
		expect(getPlaythroughById).toHaveBeenCalledWith("run_1", expect.anything());
		expect(result).toEqual({ id: "run_1", userId: "owner_1" });
	});

	it("delegates createOwnedPlaythrough to startPlaythroughAction", async () => {
		// Arrange
		vi.mocked(getCurrentUser).mockResolvedValueOnce({ id: "owner_1" });
		const startSpy = vi
			.spyOn(playthroughActions, "startPlaythroughAction")
			.mockResolvedValueOnce({
				playthrough: { id: "run_1" } as never,
				scenarioSnapshotIds: [],
				success: true,
			});
		const input = {
			modules: [],
			scenarios: [],
			vodId: "vod_1",
		};

		// Act
		const result = await createOwnedPlaythrough(input);

		// Assert
		expect(startSpy).toHaveBeenCalledWith(
			expect.objectContaining({ vodId: "vod_1" }),
			expect.anything(),
		);
		expect(result).toEqual({
			playthrough: { id: "run_1" },
			scenarioSnapshotIds: [],
			success: true,
		});
	});

	it("scopes history, attempts, and completion to the authenticated user", async () => {
		// Arrange
		vi.mocked(getCurrentUser).mockResolvedValue({ id: "owner_1" });
		vi.mocked(getPlaythroughById).mockResolvedValue({
			id: "run_1",
			userId: "owner_1",
		} as never);
		vi.mocked(queryPlaythroughs).mockResolvedValueOnce([]);
		vi.mocked(queryAttemptRecords).mockResolvedValueOnce([]);
		const completeSpy = vi
			.spyOn(playthroughActions, "completePlaythroughAction")
			.mockResolvedValueOnce({
				completion: { id: "comp_1" } as never,
				success: true,
			});

		// Act
		await getOwnedPlayerHistory();
		await getOwnedPlaythroughAttempts("run_1");
		await completeOwnedPlaythrough("run_1");

		// Assert
		expect(queryPlaythroughs).toHaveBeenCalledWith(
			{ filter: { userId: { eq: "owner_1" } } },
			expect.anything(),
		);
		expect(queryAttemptRecords).toHaveBeenCalledWith(
			{
				filter: {
					playthroughId: { eq: "run_1" },
					userId: { eq: "owner_1" },
				},
				order: { createdAt: "asc" },
			},
			expect.anything(),
		);
		expect(completeSpy).toHaveBeenCalledWith("run_1", expect.anything());
	});

	it("returns null when playthrough is missing or belongs to another user", async () => {
		// Arrange
		vi.mocked(getCurrentUser).mockResolvedValue({ id: "owner_1" });
		vi.mocked(getPlaythroughById)
			.mockResolvedValueOnce(undefined)
			.mockResolvedValueOnce({
				id: "run_2",
				userId: "other_user",
			} as never);

		// Act
		const resultNull = await getOwnedPlaythrough("missing_run");
		const resultOther = await getOwnedPlaythrough("run_2");

		// Assert
		expect(resultNull).toBeNull();
		expect(resultOther).toBeNull();
	});

	it("returns empty array when playthrough attempts requested for unowned or missing playthrough", async () => {
		// Arrange
		vi.mocked(getCurrentUser).mockResolvedValue({ id: "owner_1" });
		vi.mocked(getPlaythroughById)
			.mockResolvedValueOnce(undefined)
			.mockResolvedValueOnce({
				id: "run_2",
				userId: "other_user",
			} as never);

		// Act
		const resultNull = await getOwnedPlaythroughAttempts("missing_run");
		const resultOther = await getOwnedPlaythroughAttempts("run_2");

		// Assert
		expect(resultNull).toEqual([]);
		expect(resultOther).toEqual([]);
	});
});
