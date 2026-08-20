import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../audit");
vi.mock("../../client/client");

import { getDb } from "../../client/client";
import { createAuditEntry } from "../audit";
import { getUserById, getUserCount, getUsers, updateUserRole } from "../users";

describe("users repository", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("getUserCount returns total user count", async () => {
		// Arrange
		const mockDb = {
			select: vi.fn().mockReturnValue({
				from: vi.fn().mockResolvedValue([{ value: 5 }]),
			}),
		};
		vi.mocked(getDb).mockResolvedValue(mockDb as never);

		// Act
		const count = await getUserCount();

		// Assert
		expect(count).toBe(5);
	});

	it("getUserById returns user record when found", async () => {
		// Arrange
		const mockUser = {
			email: "user@example.com",
			id: "usr_123",
			name: "Test User",
			role: "PLAYER",
		};
		const mockDb = {
			query: {
				users: {
					findFirst: vi.fn().mockImplementation((options) => {
						if (options?.where) {
							options.where({ id: "usr_123" }, { eq: vi.fn() });
						}
						return Promise.resolve(mockUser);
					}),
				},
			},
		};
		vi.mocked(getDb).mockResolvedValue(mockDb as never);

		// Act
		const user = await getUserById("usr_123");

		// Assert
		expect(user).toEqual(mockUser);
	});

	it("getUserById returns null when user is not found", async () => {
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
		const user = await getUserById("usr_missing");

		// Assert
		expect(user).toBeNull();
	});

	it("getUsers returns users with default ordering and no filter", async () => {
		// Arrange
		const mockUsers = [
			{ email: "admin@example.com", id: "1", name: "Admin", role: "ADMIN" },
			{ email: "player@example.com", id: "2", name: "Player", role: "PLAYER" },
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
		const users = await getUsers();

		// Assert
		expect(users).toEqual(mockUsers);
		expect(mockDb.query.users.findMany).toHaveBeenCalled();
	});

	it("getUsers filters by search term and role", async () => {
		// Arrange
		const mockUsers = [
			{ email: "admin@example.com", id: "1", name: "Admin", role: "ADMIN" },
		];
		const mockDb = {
			query: {
				users: {
					findMany: vi.fn().mockImplementation((options) => {
						const mockOr = vi.fn().mockReturnValue("or_clause");
						const mockLike = vi.fn().mockReturnValue("like_clause");
						const mockEq = vi.fn().mockReturnValue("eq_clause");
						const mockAnd = vi.fn().mockReturnValue("and_clause");
						if (options?.where) {
							options.where(
								{ email: "email", name: "name", role: "role" },
								{ and: mockAnd, eq: mockEq, like: mockLike, or: mockOr },
							);
						}
						return Promise.resolve(mockUsers);
					}),
				},
			},
		};
		vi.mocked(getDb).mockResolvedValue(mockDb as never);

		// Act
		const users = await getUsers({ role: "ADMIN", search: "admin" });

		// Assert
		expect(users).toEqual(mockUsers);
	});

	it("getUsers filters by search only or role only", async () => {
		// Arrange
		const mockUsers = [
			{ email: "player@example.com", id: "2", name: "Player", role: "PLAYER" },
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
		const searchOnly = await getUsers({ search: "player" });
		const roleOnly = await getUsers({ role: "PLAYER" });

		// Assert
		expect(searchOnly).toEqual(mockUsers);
		expect(roleOnly).toEqual(mockUsers);
	});

	it("updateUserRole rejects self-demotion", async () => {
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
		expect(createAuditEntry).not.toHaveBeenCalled();
	});

	it("updateUserRole allows self-promotion/re-assignment to ADMIN", async () => {
		// Arrange
		const mockAdmin = {
			email: "admin@example.com",
			id: "usr_admin",
			name: "Admin User",
			role: "ADMIN",
		};
		const mockDb = {
			query: {
				users: {
					findFirst: vi.fn().mockResolvedValue(mockAdmin),
				},
			},
		};
		vi.mocked(getDb).mockResolvedValue(mockDb as never);

		// Act
		const result = await updateUserRole({
			actorUserId: "usr_admin",
			newRole: "ADMIN",
			targetUserId: "usr_admin",
		});

		// Assert
		expect(result).toEqual({
			success: true,
			user: mockAdmin,
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
			actorUserId: "usr_admin",
			newRole: "ADMIN",
			targetUserId: "usr_nonexistent",
		});

		// Assert
		expect(result).toEqual({
			error: "User not found",
			success: false,
		});
		expect(createAuditEntry).not.toHaveBeenCalled();
	});

	it("updateUserRole returns success without DB update when role unchanged", async () => {
		// Arrange
		const mockPlayer = {
			email: "player@example.com",
			id: "usr_target",
			name: "Player Target",
			role: "PLAYER",
		};
		const mockDb = {
			query: {
				users: {
					findFirst: vi.fn().mockResolvedValue(mockPlayer),
				},
			},
		};
		vi.mocked(getDb).mockResolvedValue(mockDb as never);

		// Act
		const result = await updateUserRole({
			actorUserId: "usr_admin",
			newRole: "PLAYER",
			targetUserId: "usr_target",
		});

		// Assert
		expect(result).toEqual({
			success: true,
			user: mockPlayer,
		});
		expect(createAuditEntry).not.toHaveBeenCalled();
	});

	it("updateUserRole rejects demotion of the last active administrator", async () => {
		// Arrange
		const mockTargetAdmin = {
			email: "other_admin@example.com",
			id: "usr_other_admin",
			name: "Other Admin",
			role: "ADMIN",
		};
		const mockDb = {
			query: {
				users: {
					findFirst: vi.fn().mockResolvedValue(mockTargetAdmin),
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
			actorUserId: "usr_admin",
			newRole: "PLAYER",
			targetUserId: "usr_other_admin",
		});

		// Assert
		expect(result).toEqual({
			error: "Cannot demote the last remaining administrator",
			success: false,
		});
		expect(createAuditEntry).not.toHaveBeenCalled();
	});

	it("updateUserRole promotes PLAYER to ADMIN and creates audit entry", async () => {
		// Arrange
		const mockTargetPlayer = {
			email: "player@example.com",
			id: "usr_target",
			name: "Target Player",
			role: "PLAYER",
		};
		const updatedPlayer = {
			...mockTargetPlayer,
			role: "ADMIN",
		};
		const mockDb = {
			query: {
				users: {
					findFirst: vi.fn().mockResolvedValue(mockTargetPlayer),
				},
			},
			update: vi.fn().mockReturnValue({
				set: vi.fn().mockReturnValue({
					where: vi.fn().mockReturnValue({
						returning: vi.fn().mockResolvedValue([updatedPlayer]),
					}),
				}),
			}),
		};
		vi.mocked(getDb).mockResolvedValue(mockDb as never);

		// Act
		const result = await updateUserRole({
			actorUserId: "usr_admin",
			newRole: "ADMIN",
			targetUserId: "usr_target",
		});

		// Assert
		expect(result).toEqual({
			success: true,
			user: updatedPlayer,
		});
		expect(createAuditEntry).toHaveBeenCalledWith(
			{
				action: "USER_ROLE_UPDATED",
				actorUserId: "usr_admin",
				entityId: "usr_target",
				entityType: "USER",
				metadata: {
					newRole: "ADMIN",
					previousRole: "PLAYER",
				},
			},
			undefined,
		);
	});

	it("updateUserRole demotes ADMIN to PLAYER when multiple admins exist", async () => {
		// Arrange
		const mockTargetAdmin = {
			email: "other_admin@example.com",
			id: "usr_other_admin",
			name: "Other Admin",
			role: "ADMIN",
		};
		const updatedTarget = {
			...mockTargetAdmin,
			role: "PLAYER",
		};
		const mockDb = {
			query: {
				users: {
					findFirst: vi.fn().mockResolvedValue(mockTargetAdmin),
				},
			},
			select: vi.fn().mockReturnValue({
				from: vi.fn().mockReturnValue({
					where: vi.fn().mockResolvedValue([{ value: 2 }]),
				}),
			}),
			update: vi.fn().mockReturnValue({
				set: vi.fn().mockReturnValue({
					where: vi.fn().mockReturnValue({
						returning: vi.fn().mockResolvedValue([updatedTarget]),
					}),
				}),
			}),
		};
		vi.mocked(getDb).mockResolvedValue(mockDb as never);

		// Act
		const result = await updateUserRole({
			actorUserId: "usr_admin",
			newRole: "PLAYER",
			targetUserId: "usr_other_admin",
		});

		// Assert
		expect(result).toEqual({
			success: true,
			user: updatedTarget,
		});
		expect(createAuditEntry).toHaveBeenCalledWith(
			{
				action: "USER_ROLE_UPDATED",
				actorUserId: "usr_admin",
				entityId: "usr_other_admin",
				entityType: "USER",
				metadata: {
					newRole: "PLAYER",
					previousRole: "ADMIN",
				},
			},
			undefined,
		);
	});
});
