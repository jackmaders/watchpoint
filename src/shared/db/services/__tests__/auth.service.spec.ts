import { beforeEach, describe, expect, it, vi } from "vitest";
import { getDb } from "../../core/client";
import { authService } from "../auth.service";

vi.mock("../../core/client");

describe("authService", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("count", () => {
		it("returns total user count wrapped in dbSuccess", async () => {
			// Arrange
			const mockDb = {
				select: vi.fn().mockReturnValue({
					from: vi.fn().mockResolvedValue([{ value: 5 }]),
				}),
			};
			vi.mocked(getDb).mockResolvedValue(mockDb as never);

			// Act
			const result = await authService.count();

			// Assert
			expect(result).toEqual({
				data: 5,
				success: true,
			});
		});

		it("handles empty result", async () => {
			// Arrange
			const mockDb = {
				select: vi.fn().mockReturnValue({
					from: vi.fn().mockResolvedValue([]),
				}),
			};
			vi.mocked(getDb).mockResolvedValue(mockDb as never);

			// Act
			const result = await authService.count();

			// Assert
			expect(result).toEqual({
				data: 0,
				success: true,
			});
		});

		it("handles database errors (Error and non-Error)", async () => {
			// Arrange
			const mockDbError = {
				select: vi.fn().mockReturnValue({
					from: vi.fn().mockRejectedValue(new Error("D1 count failure")),
				}),
			};
			const mockDbString = {
				select: vi.fn().mockReturnValue({
					from: vi.fn().mockRejectedValue("String error"),
				}),
			};

			// Act
			vi.mocked(getDb).mockResolvedValueOnce(mockDbError as never);
			const res1 = await authService.count();

			vi.mocked(getDb).mockResolvedValueOnce(mockDbString as never);
			const res2 = await authService.count();

			// Assert
			expect(res1).toEqual({
				error: "D1 count failure",
				success: false,
			});
			expect(res2).toEqual({
				error: "Failed to retrieve user count",
				success: false,
			});
		});
	});

	describe("getById", () => {
		it("returns user record when found", async () => {
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
			const result = await authService.getById({ id: "usr_123" });

			// Assert
			expect(result).toEqual({
				data: mockUser,
				success: true,
			});
		});

		it("returns null data when user is not found", async () => {
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
			const result = await authService.getById({ id: "usr_missing" });

			// Assert
			expect(result).toEqual({
				data: null,
				success: true,
			});
		});

		it("handles database error (Error and non-Error)", async () => {
			// Arrange
			const mockDbError = {
				query: {
					users: {
						findFirst: vi.fn().mockRejectedValue(new Error("Lookup failed")),
					},
				},
			};
			const mockDbString = {
				query: {
					users: {
						findFirst: vi.fn().mockRejectedValue("String error"),
					},
				},
			};

			// Act
			vi.mocked(getDb).mockResolvedValueOnce(mockDbError as never);
			const res1 = await authService.getById({ id: "usr_123" });

			vi.mocked(getDb).mockResolvedValueOnce(mockDbString as never);
			const res2 = await authService.getById({ id: "usr_123" });

			// Assert
			expect(res1).toEqual({
				error: "Lookup failed",
				success: false,
			});
			expect(res2).toEqual({
				error: "Failed to retrieve user by ID",
				success: false,
			});
		});
	});

	describe("list", () => {
		it("returns paginated users list with search escaping and role filters", async () => {
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
						findMany: vi.fn().mockResolvedValue(mockUsers),
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
			const resultBoth = await authService.list({
				role: "ADMIN",
				search: "adm%_\\",
			});
			const resultSearch = await authService.list({ search: "adm" });
			const resultRole = await authService.list({ role: "ADMIN" });
			const resultNone = await authService.list({});

			// Assert
			const expectedPaginated = {
				data: {
					items: mockUsers,
					page: 1,
					pageSize: 10,
					total: 1,
					totalPages: 1,
				},
				success: true,
			};
			expect(resultBoth).toEqual(expectedPaginated);
			expect(resultSearch).toEqual(expectedPaginated);
			expect(resultRole).toEqual(expectedPaginated);
			expect(resultNone).toEqual(expectedPaginated);
		});

		it("handles empty list results with default count", async () => {
			// Arrange
			const mockDb = {
				query: {
					users: {
						findMany: vi.fn().mockResolvedValue([]),
					},
				},
				select: vi.fn().mockReturnValue({
					from: vi.fn().mockReturnValue({
						where: vi.fn().mockResolvedValue([]),
					}),
				}),
			};
			vi.mocked(getDb).mockResolvedValue(mockDb as never);

			// Act
			const result = await authService.list();

			// Assert
			expect(result).toEqual({
				data: {
					items: [],
					page: 1,
					pageSize: 10,
					total: 0,
					totalPages: 1,
				},
				success: true,
			});
		});

		it("handles database errors (Error and non-Error)", async () => {
			// Arrange
			const mockDbError = {
				query: {
					users: {
						findMany: vi.fn().mockResolvedValue([]),
					},
				},
				select: vi.fn().mockReturnValue({
					from: vi.fn().mockReturnValue({
						where: vi.fn().mockRejectedValue(new Error("Fetch failed")),
					}),
				}),
			};
			const mockDbString = {
				query: {
					users: {
						findMany: vi.fn().mockResolvedValue([]),
					},
				},
				select: vi.fn().mockReturnValue({
					from: vi.fn().mockReturnValue({
						where: vi.fn().mockRejectedValue("String error"),
					}),
				}),
			};

			// Act
			vi.mocked(getDb).mockResolvedValueOnce(mockDbError as never);
			const res1 = await authService.list();

			vi.mocked(getDb).mockResolvedValueOnce(mockDbString as never);
			const res2 = await authService.list();

			// Assert
			expect(res1).toEqual({
				error: "Fetch failed",
				success: false,
			});
			expect(res2).toEqual({
				error: "Failed to retrieve users",
				success: false,
			});
		});
	});

	describe("updateUserRole", () => {
		it("rejects invalid parameters via Zod", async () => {
			// Arrange & Act
			const result = await authService.updateUserRole({
				actorUserId: "",
				newRole: "ADMIN",
				targetUserId: "target_1",
			});

			// Assert
			expect(result.success).toBe(false);
		});

		it("rejects self-demotion from ADMIN", async () => {
			// Arrange & Act
			const result = await authService.updateUserRole({
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

		it("returns error when target user does not exist", async () => {
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
			const result = await authService.updateUserRole({
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

		it("returns success immediately if role is unchanged", async () => {
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
			const result = await authService.updateUserRole({
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

		it("rejects demoting the last remaining administrator", async () => {
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
			const result = await authService.updateUserRole({
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

		it("updates role and creates audit entry on success", async () => {
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
				insert: vi.fn().mockReturnValue({
					values: vi.fn().mockReturnValue({
						returning: vi.fn().mockResolvedValue([{ id: "audit_1" }]),
					}),
				}),
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
			const result = await authService.updateUserRole({
				actorUserId: "actor_1",
				newRole: "ADMIN",
				targetUserId: "target_1",
			});

			// Assert
			expect(result).toEqual({
				data: updatedUser,
				success: true,
			});
		});

		it("handles getUserById query failure", async () => {
			// Arrange
			const mockDb = {
				query: {
					users: {
						findFirst: vi
							.fn()
							.mockRejectedValue(new Error("User lookup failed")),
					},
				},
			};
			vi.mocked(getDb).mockResolvedValue(mockDb as never);

			// Act
			const result = await authService.updateUserRole({
				actorUserId: "actor_1",
				newRole: "ADMIN",
				targetUserId: "target_1",
			});

			// Assert
			expect(result).toEqual({
				error: "User lookup failed",
				success: false,
			});
		});

		it("handles empty returning array on update", async () => {
			// Arrange
			const mockTarget = {
				id: "target_1",
				name: "Target User",
				role: "PLAYER" as const,
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
							returning: vi.fn().mockResolvedValue([]),
						}),
					}),
				}),
			};
			vi.mocked(getDb).mockResolvedValue(mockDb as never);

			// Act
			const result = await authService.updateUserRole({
				actorUserId: "actor_1",
				newRole: "ADMIN",
				targetUserId: "target_1",
			});

			// Assert
			expect(result).toEqual({
				error: "Failed to update user role",
				success: false,
			});
		});

		it("handles exceptions during update (Error and non-Error)", async () => {
			// Arrange
			const mockTarget = {
				id: "target_1",
				name: "Target User",
				role: "PLAYER" as const,
			};
			const mockDbError = {
				query: {
					users: {
						findFirst: vi.fn().mockResolvedValue(mockTarget),
					},
				},
				update: vi.fn().mockReturnValue({
					set: vi.fn().mockReturnValue({
						where: vi.fn().mockReturnValue({
							returning: vi.fn().mockRejectedValue(new Error("Write error")),
						}),
					}),
				}),
			};
			const mockDbString = {
				query: {
					users: {
						findFirst: vi.fn().mockResolvedValue(mockTarget),
					},
				},
				update: vi.fn().mockReturnValue({
					set: vi.fn().mockReturnValue({
						where: vi.fn().mockReturnValue({
							returning: vi.fn().mockRejectedValue("string update failure"),
						}),
					}),
				}),
			};
			// Act
			vi.mocked(getDb).mockResolvedValue(mockDbError as never);
			const res1 = await authService.updateUserRole({
				actorUserId: "actor_1",
				newRole: "ADMIN",
				targetUserId: "target_1",
			});

			vi.mocked(getDb).mockResolvedValue(mockDbString as never);
			const res2 = await authService.updateUserRole({
				actorUserId: "actor_1",
				newRole: "ADMIN",
				targetUserId: "target_1",
			});

			// Assert
			expect(res1).toEqual({
				error: "Write error",
				success: false,
			});
			expect(res2).toEqual({
				error: "Failed to update user role",
				success: false,
			});
		});

		it("allows demoting an administrator when more than one remains", async () => {
			// Arrange
			const mockTarget = {
				id: "target_1",
				name: "Target Admin",
				role: "ADMIN" as const,
			};
			const updatedUser = {
				...mockTarget,
				role: "PLAYER" as const,
			};
			const mockDb = {
				insert: vi.fn().mockReturnValue({
					values: vi.fn().mockReturnValue({
						returning: vi.fn().mockResolvedValue([{ id: "audit_1" }]),
					}),
				}),
				query: {
					users: {
						findFirst: vi.fn().mockResolvedValue(mockTarget),
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
							returning: vi.fn().mockResolvedValue([updatedUser]),
						}),
					}),
				}),
			};
			vi.mocked(getDb).mockResolvedValue(mockDb as never);

			// Act
			const result = await authService.updateUserRole({
				actorUserId: "actor_other",
				newRole: "PLAYER",
				targetUserId: "target_1",
			});

			// Assert
			expect(result).toEqual({
				data: updatedUser,
				success: true,
			});
		});
	});
});
