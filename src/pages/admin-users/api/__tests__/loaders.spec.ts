import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../server-fns");

import { loadAdminUsers } from "../loaders";
import { getAdminUsers } from "../server-fns";

describe("loadAdminUsers", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("fetches admin users with empty query object", async () => {
		// Arrange
		const mockUsers = [{ email: "test@example.com", id: "u1" }] as never;
		vi.mocked(getAdminUsers).mockResolvedValueOnce(mockUsers);

		// Act
		const result = await loadAdminUsers();

		// Assert
		expect(getAdminUsers).toHaveBeenCalledWith({ data: {} });
		expect(result).toEqual({ users: mockUsers });
	});
});
