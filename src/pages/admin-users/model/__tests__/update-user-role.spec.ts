/**
 * Tests the updateUserRole business rule function.
 *
 * Verifies self-demotion prevention, target existence checks, last-admin demotion protection,
 * and successful role transitions with audit entry creation.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/shared/db");

import {
	createAuditEntry,
	getUserById,
	queryUsers,
	updateUser,
} from "@/shared/db";
import { updateUserRoleRule } from "../update-user-role";

describe("updateUserRoleRule", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("rejects self-demotion when an admin attempts to change their own role to PLAYER", async () => {
		// Arrange & Act
		const result = await updateUserRoleRule({
			actorUserId: "usr_admin",
			newRole: "PLAYER",
			targetUserId: "usr_admin",
		});

		// Assert
		expect(result).toEqual({
			reason: "Cannot demote your own account",
			status: "rejected",
		});
		expect(updateUser).not.toHaveBeenCalled();
	});

	it("rejects when target user does not exist", async () => {
		// Arrange
		vi.mocked(getUserById).mockResolvedValueOnce(null as never);

		// Act
		const result = await updateUserRoleRule({
			actorUserId: "usr_admin",
			newRole: "ADMIN",
			targetUserId: "usr_nonexistent",
		});

		// Assert
		expect(result).toEqual({
			reason: "User not found",
			status: "rejected",
		});
	});

	it("returns success early if user already has target role", async () => {
		// Arrange
		const existingAdmin = {
			createdAt: new Date(),
			email: "admin2@example.com",
			emailVerified: true,
			id: "usr_admin2",
			image: null,
			isTestAccount: false,
			name: "Admin Two",
			role: "ADMIN" as const,
			updatedAt: new Date(),
		};
		vi.mocked(getUserById).mockResolvedValueOnce(existingAdmin);

		// Act
		const result = await updateUserRoleRule({
			actorUserId: "usr_admin",
			newRole: "ADMIN",
			targetUserId: "usr_admin2",
		});

		// Assert
		expect(result).toEqual({
			status: "success",
			user: existingAdmin,
		});
		expect(updateUser).not.toHaveBeenCalled();
	});

	it("rejects demoting the last remaining administrator", async () => {
		// Arrange
		const lastAdmin = {
			createdAt: new Date(),
			email: "admin2@example.com",
			emailVerified: true,
			id: "usr_admin2",
			image: null,
			isTestAccount: false,
			name: "Admin Two",
			role: "ADMIN" as const,
			updatedAt: new Date(),
		};
		vi.mocked(getUserById).mockResolvedValueOnce(lastAdmin);
		vi.mocked(queryUsers).mockResolvedValueOnce([lastAdmin]);

		// Act
		const result = await updateUserRoleRule({
			actorUserId: "usr_admin",
			newRole: "PLAYER",
			targetUserId: "usr_admin2",
		});

		// Assert
		expect(result).toEqual({
			reason: "Cannot demote the last remaining administrator",
			status: "rejected",
		});
		expect(updateUser).not.toHaveBeenCalled();
	});

	it("successfully updates role and creates audit entry", async () => {
		// Arrange
		const playerUser = {
			createdAt: new Date(),
			email: "player@example.com",
			emailVerified: true,
			id: "usr_player",
			image: null,
			isTestAccount: false,
			name: "Player User",
			role: "PLAYER" as const,
			updatedAt: new Date(),
		};
		const updatedUser = {
			...playerUser,
			role: "ADMIN" as const,
		};
		vi.mocked(getUserById).mockResolvedValueOnce(playerUser);
		vi.mocked(updateUser).mockResolvedValueOnce(updatedUser);
		vi.mocked(createAuditEntry).mockResolvedValueOnce({
			id: "audit_1",
		} as never);

		// Act
		const result = await updateUserRoleRule({
			actorUserId: "usr_admin",
			newRole: "ADMIN",
			targetUserId: "usr_player",
		});

		// Assert
		expect(result).toEqual({
			status: "success",
			user: updatedUser,
		});
		expect(updateUser).toHaveBeenCalledWith(
			"usr_player",
			expect.objectContaining({ role: "ADMIN" }),
			undefined,
		);
		expect(createAuditEntry).toHaveBeenCalledWith(
			expect.objectContaining({
				action: "USER_ROLE_UPDATED",
				actorUserId: "usr_admin",
				entityId: "usr_player",
				entityType: "USER",
				metadata: {
					newRole: "ADMIN",
					previousRole: "PLAYER",
				},
			}),
			undefined,
		);
	});

	it("returns rejection if database update fails to return record", async () => {
		// Arrange
		const playerUser = {
			createdAt: new Date(),
			email: "player@example.com",
			emailVerified: true,
			id: "usr_player",
			image: null,
			isTestAccount: false,
			name: "Player User",
			role: "PLAYER" as const,
			updatedAt: new Date(),
		};
		vi.mocked(getUserById).mockResolvedValueOnce(playerUser);
		vi.mocked(updateUser).mockResolvedValueOnce(null as never);

		// Act
		const result = await updateUserRoleRule({
			actorUserId: "usr_admin",
			newRole: "ADMIN",
			targetUserId: "usr_player",
		});

		// Assert
		expect(result).toEqual({
			reason: "Failed to update user role",
			status: "rejected",
		});
	});
});
