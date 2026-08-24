import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	completePlaythrough,
	createPlaythrough,
	getPlayerHistory,
	getPlaythrough,
	getPlaythroughAttempts,
} from "@/shared/db";
import { getCurrentUser } from "@/shared/lib/auth";
import {
	completeOwnedPlaythrough,
	createOwnedPlaythrough,
	getOwnedPlayerHistory,
	getOwnedPlaythrough,
	getOwnedPlaythroughAttempts,
} from "../owned-playthroughs";

vi.mock("@/shared/db");
vi.mock("@/shared/lib/auth");

describe("owned playthrough server boundary", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("rejects anonymous playthrough reads without querying the repository", async () => {
		// Arrange
		vi.mocked(getCurrentUser).mockResolvedValueOnce(null);

		// Act & Assert
		await expect(getOwnedPlaythrough("other_run")).rejects.toThrow(
			"Authentication required",
		);
		expect(getPlaythrough).not.toHaveBeenCalled();
	});

	it("uses the authenticated user for playthrough reads", async () => {
		// Arrange
		vi.mocked(getCurrentUser).mockResolvedValueOnce({ id: "owner_1" });
		vi.mocked(getPlaythrough).mockResolvedValueOnce({ id: "run_1" } as never);

		// Act
		const result = await getOwnedPlaythrough("run_1");

		// Assert
		expect(getPlaythrough).toHaveBeenCalledWith("run_1", "owner_1", undefined);
		expect(result).toEqual({ id: "run_1" });
	});

	it("ignores a client user id when creating a playthrough", async () => {
		// Arrange
		vi.mocked(getCurrentUser).mockResolvedValueOnce({ id: "owner_1" });
		vi.mocked(createPlaythrough).mockResolvedValueOnce({
			id: "run_1",
		} as never);
		const input = {
			modules: [],
			scenarios: [],
			userId: "attacker",
			vodId: "vod_1",
		};

		// Act
		const result = await createOwnedPlaythrough(input);

		// Assert
		expect(createPlaythrough).toHaveBeenCalledWith(
			expect.objectContaining({ userId: "owner_1" }),
			undefined,
		);
		expect(createPlaythrough).not.toHaveBeenCalledWith(
			expect.objectContaining({ userId: "attacker" }),
			expect.anything(),
		);
		expect(result).toEqual({ id: "run_1" });
	});

	it("scopes history, attempts, and completion to the authenticated user", async () => {
		// Arrange
		vi.mocked(getCurrentUser).mockResolvedValue({ id: "owner_1" });

		// Act
		await getOwnedPlayerHistory();
		await getOwnedPlaythroughAttempts("run_1");
		await completeOwnedPlaythrough("run_1");

		// Assert
		expect(getPlayerHistory).toHaveBeenCalledWith("owner_1", undefined);
		expect(getPlaythroughAttempts).toHaveBeenCalledWith(
			"run_1",
			"owner_1",
			undefined,
		);
		expect(completePlaythrough).toHaveBeenCalledWith(
			"run_1",
			"owner_1",
			undefined,
		);
	});
});
