import { describe, expect, it } from "vitest";
import {
	insertUserSchema,
	selectUserSchema,
	updateUserRoleInputSchema,
} from "../auth";

describe("auth validation schemas", () => {
	it("validates valid user insert input", () => {
		// Arrange
		const input = {
			email: "player@example.com",
			name: "Player One",
		};

		// Act
		const result = insertUserSchema.safeParse(input);

		// Assert
		expect(result.success).toBe(true);
	});

	it("rejects invalid email or empty name", () => {
		// Act & Assert
		expect(
			insertUserSchema.safeParse({ email: "invalid-email", name: "Player" })
				.success,
		).toBe(false);
		expect(
			insertUserSchema.safeParse({
				email: "player@example.com",
				name: "",
			}).success,
		).toBe(false);
	});

	it("validates updateUserRoleInputSchema", () => {
		// Arrange
		const input = {
			actorUserId: "admin_1",
			newRole: "ADMIN" as const,
			targetUserId: "user_2",
		};

		// Act
		const result = updateUserRoleInputSchema.safeParse(input);

		// Assert
		expect(result.success).toBe(true);
	});

	it("rejects invalid user role or empty IDs", () => {
		// Act & Assert
		expect(
			updateUserRoleInputSchema.safeParse({
				actorUserId: "",
				newRole: "ADMIN",
				targetUserId: "user_2",
			}).success,
		).toBe(false);

		expect(
			updateUserRoleInputSchema.safeParse({
				actorUserId: "admin_1",
				newRole: "SUPERUSER" as never,
				targetUserId: "user_2",
			}).success,
		).toBe(false);
	});

	it("validates selectUserSchema", () => {
		// Arrange
		const user = {
			createdAt: new Date(),
			email: "player@example.com",
			emailVerified: false,
			id: "user_1",
			image: null,
			isTestAccount: false,
			name: "Player One",
			role: "PLAYER" as const,
			updatedAt: new Date(),
		};

		// Act
		const result = selectUserSchema.safeParse(user);

		// Assert
		expect(result.success).toBe(true);
	});
});
