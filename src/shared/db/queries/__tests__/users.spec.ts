/**
 * Tests direct domain query functions for the users table.
 *
 * Verifies standard list queries with pagination and filtering, primary key lookups,
 * inserts, updates, and deletions using Drizzle 1.0 conventions.
 */

import { describe, expect, it } from "vitest";
import {
	createUser,
	deleteUser,
	getUserByEmail,
	getUserById,
	queryUsers,
	updateUser,
} from "../users";

describe("users domain queries", () => {
	it("executes queryUsers with default limit and filtering", async () => {
		// Arrange
		let capturedSelect: unknown;
		const mockDb = {
			select: () => ({
				from: () => ({
					where: (whereClause: unknown) => ({
						orderBy: () => ({
							limit: (limitCount: number) => ({
								all: () => {
									capturedSelect = { limitCount, whereClause };
									return Promise.resolve([{ id: "user-1", name: "Test User" }]);
								},
							}),
						}),
					}),
				}),
			}),
		} as unknown as Parameters<typeof queryUsers>[1];

		// Act
		const result = await queryUsers({ limit: 25 }, mockDb);

		// Assert
		expect(result).toEqual([{ id: "user-1", name: "Test User" }]);
		expect(capturedSelect).toEqual(expect.objectContaining({ limitCount: 25 }));
	});

	it("executes createUser and returns inserted record", async () => {
		// Arrange
		const newUser = {
			createdAt: new Date(),
			email: "user@example.com",
			emailVerified: false,
			id: "user-1",
			image: null,
			isTestAccount: false,
			name: "Test User",
			role: "PLAYER" as const,
			updatedAt: new Date(),
		};
		const mockDb = {
			insert: () => ({
				values: (vals: unknown) => ({
					returning: () => ({
						get: () => Promise.resolve(vals),
					}),
				}),
			}),
		} as unknown as Parameters<typeof createUser>[1];

		// Act
		const result = await createUser(newUser, mockDb);

		// Assert
		expect(result).toEqual(newUser);
	});

	it("executes getUserById returning matching row", async () => {
		// Arrange
		const mockDb = {
			select: () => ({
				from: () => ({
					where: () => ({
						get: () => Promise.resolve({ id: "user-123", name: "Ada" }),
					}),
				}),
			}),
		} as unknown as Parameters<typeof getUserById>[1];

		// Act
		const result = await getUserById("user-123", mockDb);

		// Assert
		expect(result).toEqual({ id: "user-123", name: "Ada" });
	});

	it("executes getUserByEmail returning matching row", async () => {
		// Arrange
		const mockDb = {
			select: () => ({
				from: () => ({
					where: () => ({
						get: () =>
							Promise.resolve({ email: "ada@example.com", id: "user-123" }),
					}),
				}),
			}),
		} as unknown as Parameters<typeof getUserByEmail>[1];

		// Act
		const result = await getUserByEmail("ada@example.com", mockDb);

		// Assert
		expect(result).toEqual({ email: "ada@example.com", id: "user-123" });
	});

	it("executes updateUser and returns updated row", async () => {
		// Arrange
		const updatedRow = {
			id: "user-123",
			name: "Updated Name",
			role: "ADMIN" as const,
		};
		const mockDb = {
			update: () => ({
				set: () => ({
					where: () => ({
						returning: () => ({
							get: () => Promise.resolve(updatedRow),
						}),
					}),
				}),
			}),
		} as unknown as Parameters<typeof updateUser>[2];

		// Act
		const result = await updateUser("user-123", { role: "ADMIN" }, mockDb);

		// Assert
		expect(result).toEqual(updatedRow);
	});

	it("executes deleteUser and returns deleted row", async () => {
		// Arrange
		const mockDb = {
			delete: () => ({
				where: () => ({
					returning: () => ({
						get: () => Promise.resolve({ id: "user-123" }),
					}),
				}),
			}),
		} as unknown as Parameters<typeof deleteUser>[1];

		// Act
		const result = await deleteUser("user-123", mockDb);

		// Assert
		expect(result).toEqual({ id: "user-123" });
	});
});
