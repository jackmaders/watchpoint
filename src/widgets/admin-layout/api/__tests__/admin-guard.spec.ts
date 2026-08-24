import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@tanstack/react-router");
vi.mock("../server-fns");

import { redirect } from "@tanstack/react-router";
import { adminBeforeLoad } from "../admin-guard";
import { checkAdminAccess } from "../server-fns";

describe("admin layout guard", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("returns authorized user when checkAdminAccess succeeds", async () => {
		// Arrange
		const mockUser = { id: "usr_1", role: "ADMIN" as const };
		vi.mocked(checkAdminAccess).mockResolvedValueOnce(mockUser as never);

		// Act
		const result = await adminBeforeLoad();

		// Assert
		expect(result).toEqual({ unauthorized: false, user: mockUser });
	});

	it("returns unauthorized flag when 403 response is thrown", async () => {
		// Arrange
		vi.mocked(checkAdminAccess).mockRejectedValueOnce(
			new Response(null, { status: 403 }),
		);

		// Act
		const result = await adminBeforeLoad();

		// Assert
		expect(result).toEqual({ unauthorized: true, user: null });
	});

	it("redirects to home when non-403 error is thrown", async () => {
		// Arrange
		vi.mocked(checkAdminAccess).mockRejectedValueOnce(
			new Error("Unauthorized"),
		);

		// Act & Assert
		await expect(adminBeforeLoad()).rejects.toThrow();
		expect(redirect).toHaveBeenCalledWith({ to: "/" });
	});
});
