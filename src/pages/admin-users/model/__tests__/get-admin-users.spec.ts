/**
 * Tests getAdminUsersRule business query helper.
 *
 * Verifies user list querying with role filtering and in-memory search across names and emails.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/shared/db");

import { queryUsers } from "@/shared/db";
import { getAdminUsersRule } from "../get-admin-users";

describe("getAdminUsersRule", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("returns all users when no filter or search provided", async () => {
		// Arrange
		const mockUsers = [
			{
				createdAt: new Date(),
				email: "admin@example.com",
				emailVerified: true,
				id: "u1",
				image: null,
				isTestAccount: false,
				name: "Admin User",
				role: "ADMIN" as const,
				updatedAt: new Date(),
			},
		];
		vi.mocked(queryUsers).mockResolvedValueOnce(mockUsers);

		// Act
		const result = await getAdminUsersRule();

		// Assert
		expect(queryUsers).toHaveBeenCalledWith({ filter: undefined });
		expect(result).toEqual(mockUsers);
	});

	it("applies role filter when specified", async () => {
		// Arrange
		vi.mocked(queryUsers).mockResolvedValueOnce([]);

		// Act
		await getAdminUsersRule({ role: "ADMIN" });

		// Assert
		expect(queryUsers).toHaveBeenCalledWith({ filter: { role: "ADMIN" } });
	});

	it("filters by search term against name and email", async () => {
		// Arrange
		const mockUsers = [
			{
				createdAt: new Date(),
				email: "tracer@overwatch.com",
				emailVerified: true,
				id: "u1",
				image: null,
				isTestAccount: false,
				name: "Lena Oxton",
				role: "PLAYER" as const,
				updatedAt: new Date(),
			},
			{
				createdAt: new Date(),
				email: "winston@overwatch.com",
				emailVerified: true,
				id: "u2",
				image: null,
				isTestAccount: false,
				name: "Winston",
				role: "ADMIN" as const,
				updatedAt: new Date(),
			},
		];
		vi.mocked(queryUsers).mockResolvedValueOnce(mockUsers);

		// Act: search by name
		const nameMatch = await getAdminUsersRule({ search: "lena" });
		expect(nameMatch).toHaveLength(1);
		expect(nameMatch[0].id).toBe("u1");

		// Act: search by email
		vi.mocked(queryUsers).mockResolvedValueOnce(mockUsers);
		const emailMatch = await getAdminUsersRule({ search: "winston@" });
		expect(emailMatch).toHaveLength(1);
		expect(emailMatch[0].id).toBe("u2");
	});
});
