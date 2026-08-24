import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../server-fns");

import { loadHistoryIdPage } from "../loaders";
import { getPlaythroughHistoryDetail } from "../server-fns";

describe("history-id loaders", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("loads playthrough detail successfully", async () => {
		// Arrange
		const mockPlaythrough = { accuracy: 90, id: "pt_1" } as never;
		vi.mocked(getPlaythroughHistoryDetail).mockResolvedValueOnce(
			mockPlaythrough,
		);

		// Act
		const result = await loadHistoryIdPage({
			params: { id: "pt_1" },
		});

		// Assert
		expect(getPlaythroughHistoryDetail).toHaveBeenCalledWith({
			data: { id: "pt_1" },
		});
		expect(result).toEqual({
			error: null,
			playthrough: mockPlaythrough,
		});
	});

	it("catches error and returns null playthrough", async () => {
		// Arrange
		vi.mocked(getPlaythroughHistoryDetail).mockRejectedValueOnce(
			new Error("Not found"),
		);

		// Act
		const result = await loadHistoryIdPage({
			params: { id: "pt_invalid" },
		});

		// Assert
		expect(result).toEqual({
			error: "Not found",
			playthrough: null,
		});
	});

	it("handles non-Error thrown values gracefully", async () => {
		// Arrange
		vi.mocked(getPlaythroughHistoryDetail).mockRejectedValueOnce(
			"Unknown detail error",
		);

		// Act
		const result = await loadHistoryIdPage({
			params: { id: "pt_invalid" },
		});

		// Assert
		expect(result).toEqual({
			error: "Failed to load session details",
			playthrough: null,
		});
	});
});
