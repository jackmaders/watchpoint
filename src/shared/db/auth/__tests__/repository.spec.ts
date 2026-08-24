import { beforeEach, describe, expect, it, vi } from "vitest";
import { createAuditEntry } from "../../audit/repository";
import { getDb } from "../../client/client";
import {
	getUserById,
	getUserCount,
	getUsers,
	updateUserRole,
} from "../repository";

vi.mock("../../client/client");
vi.mock("../../audit/repository");

describe("auth repository", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("getUserCount returns total user count wrapped in dbSuccess", async () => {
		// Arrange
		const mockDb = {
			select: vi.fn().mockReturnValue({
				from: vi.fn().mockResolvedValue([{ value: 5 }]),
			}),
		};
		vi.mocked(getDb).mockResolvedValue(mockDb as never);

		// Act
		const result = await getUserCount();

		// Assert
		expect(result).toEqual({
			data: 5,
			success: true,
		});
	});

	it("getUserCount handles database errors", async () => {
		// Arrange
		vi.mocked(getDb).mockRejectedValue(new Error("D1 count failure"));

		// Act
		const result = await getUserCount();

		// Assert
		expect(result).toEqual({
			error: "D1 count failure",
			success: false,
		});
	});

	it("getUserById returns user record when found", async () => {
		// Arrange
		const mockUser = {
			createdAt: new Date(),
			email: "user@example.com",
			emailVerified: false,
			id: "usr_123",
			image: null,
			isTestAccount: false,
			name: "Test User",
			role: "PLAYER" as const,
			updatedAt: new Date(),
		};
		const mockDb = {
			query: {
				users: {
					findFirst: vi.fn().mockResolvedValue(mockUser),
				},
			},
		};
		vi.mocked(getDb).mockResolvedValue(mockDb as never);

		// Act
		const result = await getUserById("usr_123");

		// Assert
		expect(result).toEqual({
			data: mockUser,
			success: true,
		});
	});

	it("getUserById returns null data when user is not found", async () => {
		// Arrange
		const mockDb = {
			query: {
				users: {
					findFirst: vi.fn().mockResolvedValue(null),
				},
			},
		};
		vi.mocked(getDb).mockResolvedValue(mockDb as never);

		// Act
		const result = await getUserById("usr_missing");

		// Assert
		expect(result).toEqual({
			data: null,
			success: true,
		});
	});

	it("getUserById handles database error", async () => {
		// Arrange
		vi.mocked(getDb).mockRejectedValue(new Error("Lookup failed"));

		// Act
		const result = await getUserById("usr_123");

		// Assert
		expect(result).toEqual({
			error: "Lookup failed",
			success: false,
		});
	});

	it("getUsers returns users list with filters", async () => {
		// Arrange
		const mockUsers = [
			{
				email: "admin@example.com",
				id: "1",
				name: "Admin",
				role: "ADMIN" as const,
			},
		];
		const mockDb = {
			query: {
				users: {
					findMany: vi.fn().mockImplementation((options) => {
						if (options?.where) {
							options.where(
								{ email: "email", name: "name", role: "role" },
								{ and: vi.fn(), eq: vi.fn(), like: vi.fn(), or: vi.fn() },
							);
						}
						return Promise.resolve(mockUsers);
					}),
				},
			},
		};
		vi.mocked(getDb).mockResolvedValue(mockDb as never);

		// Act
		const result = await getUsers({ role: "ADMIN", search: "adm" });

		// Assert
		expect(result).toEqual({
			data: mockUsers,
			success: true,
		});
	});

	it("getUsers handles database errors", async () => {
		// Arrange
		vi.mocked(getDb).mockRejectedValue(new Error("Fetch failed"));

		// Act
		const result = await getUsers();

		// Assert
		expect(result).toEqual({
			error: "Fetch failed",
			success: false,
		});
	});

	it("updateUserRole rejects invalid parameters via Zod", async () => {
		// Arrange & Act
		const result = await updateUserRole({
			actorUserId: "",
			newRole: "ADMIN",
			targetUserId: "target_1",
		});

		// Assert
		expect(result.success).toBe(false);
	});

	it("updateUserRole rejects self-demotion from ADMIN", async () => {
		// Arrange & Act
		const result = await updateUserRole({
			actorUserId: "usr_admin",
			newRole: "PLAYER",
			targetUserId: "usr_admin",
		});

		// Assert
		expect(result).toEqual({
			error: "Cannot demote your own account",
			success: false,
		});
	});

	it("updateUserRole returns error when target user does not exist", async () => {
		// Arrange
		const mockDb = {
			query: {
				users: {
					findFirst: vi.fn().mockResolvedValue(null),
				},
			},
		};
		vi.mocked(getDb).mockResolvedValue(mockDb as never);

		// Act
		const result = await updateUserRole({
			actorUserId: "actor_1",
			newRole: "ADMIN",
			targetUserId: "missing_target",
		});

		// Assert
		expect(result).toEqual({
			error: "User not found",
			success: false,
		});
	});

	it("updateUserRole returns success immediately if role is unchanged", async () => {
		// Arrange
		const mockUser = {
			id: "target_1",
			name: "Target",
			role: "ADMIN" as const,
		};
		const mockDb = {
			query: {
				users: {
					findFirst: vi.fn().mockResolvedValue(mockUser),
				},
			},
		};
		vi.mocked(getDb).mockResolvedValue(mockDb as never);

		// Act
		const result = await updateUserRole({
			actorUserId: "actor_1",
			newRole: "ADMIN",
			targetUserId: "target_1",
		});

		// Assert
		expect(result).toEqual({
			data: mockUser,
			success: true,
		});
	});

	it("updateUserRole rejects demoting the last remaining administrator", async () => {
		// Arrange
		const mockTarget = {
			id: "target_1",
			name: "Target Admin",
			role: "ADMIN" as const,
		};
		const mockDb = {
			query: {
				users: {
					findFirst: vi.fn().mockResolvedValue(mockTarget),
				},
			},
			select: vi.fn().mockReturnValue({
				from: vi.fn().mockReturnValue({
					where: vi.fn().mockResolvedValue([{ value: 1 }]),
				}),
			}),
		};
		vi.mocked(getDb).mockResolvedValue(mockDb as never);

		// Act
		const result = await updateUserRole({
			actorUserId: "actor_other",
			newRole: "PLAYER",
			targetUserId: "target_1",
		});

		// Assert
		expect(result).toEqual({
			error: "Cannot demote the last remaining administrator",
			success: false,
		});
	});

	it("updateUserRole updates role and creates audit entry on success", async () => {
		// Arrange
		const mockTarget = {
			id: "target_1",
			name: "Target User",
			role: "PLAYER" as const,
		};
		const updatedUser = {
			...mockTarget,
			role: "ADMIN" as const,
		};
		const mockDb = {
			query: {
				users: {
					findFirst: vi.fn().mockResolvedValue(mockTarget),
				},
			},
			update: vi.fn().mockReturnValue({
				set: vi.fn().mockReturnValue({
					where: vi.fn().mockReturnValue({
						returning: vi.fn().mockResolvedValue([updatedUser]),
					}),
				}),
			}),
		};
		vi.mocked(getDb).mockResolvedValue(mockDb as never);

		// Act
		const result = await updateUserRole({
			actorUserId: "actor_1",
			newRole: "ADMIN",
			targetUserId: "target_1",
		});

		// Assert
		expect(result).toEqual({
			data: updatedUser,
			success: true,
		});
		expect(createAuditEntry).toHaveBeenCalledWith(
			expect.objectContaining({
				action: "USER_ROLE_UPDATED",
				actorUserId: "actor_1",
				entityId: "target_1",
				entityType: "USER",
			}),
			undefined,
		);
	});
});
