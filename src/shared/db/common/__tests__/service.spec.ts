import { beforeEach, describe, expect, it, vi } from "vitest";
import { users } from "../../auth/schema";
import { getDb } from "../../core/client";
import { D1DatabaseError, D1ErrorKind } from "../../core/errors";
import { createTableService } from "../service";

vi.mock("../../core/client");

describe("createTableService", () => {
	const service = createTableService(users);

	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("getById", () => {
		it("returns record when found", async () => {
			// Arrange
			const mockUser = {
				email: "test@example.com",
				id: "usr_123",
				name: "Test User",
			};
			const mockDb = {
				select: vi.fn().mockReturnValue({
					from: vi.fn().mockReturnValue({
						where: vi.fn().mockReturnValue({
							limit: vi.fn().mockResolvedValue([mockUser]),
						}),
					}),
				}),
			};
			vi.mocked(getDb).mockResolvedValue(mockDb as never);

			// Act
			const result = await service.getById("usr_123");

			// Assert
			expect(result).toEqual(mockUser);
		});

		it("returns null when record is not found", async () => {
			// Arrange
			const mockDb = {
				select: vi.fn().mockReturnValue({
					from: vi.fn().mockReturnValue({
						where: vi.fn().mockReturnValue({
							limit: vi.fn().mockResolvedValue([]),
						}),
					}),
				}),
			};
			vi.mocked(getDb).mockResolvedValue(mockDb as never);

			// Act
			const result = await service.getById("usr_missing");

			// Assert
			expect(result).toBeNull();
		});

		it("throws parsed D1DatabaseError on database query failure", async () => {
			// Arrange
			const mockDb = {
				select: vi.fn().mockReturnValue({
					from: vi.fn().mockReturnValue({
						where: vi.fn().mockReturnValue({
							limit: vi
								.fn()
								.mockRejectedValue(new Error("SQLITE_BUSY: locked")),
						}),
					}),
				}),
			};
			vi.mocked(getDb).mockResolvedValue(mockDb as never);

			// Act & Assert
			await expect(service.getById("usr_123")).rejects.toMatchObject({
				kind: D1ErrorKind.BUSY,
				name: "D1DatabaseError",
			});
		});

		it("throws parsed D1DatabaseError on connection failure", async () => {
			// Arrange
			vi.mocked(getDb).mockRejectedValue(new Error("D1 connection lost"));

			// Act & Assert
			await expect(service.getById("usr_123")).rejects.toThrow(D1DatabaseError);
		});
	});

	describe("exists", () => {
		it("returns true when record exists", async () => {
			// Arrange
			const mockDb = {
				select: vi.fn().mockReturnValue({
					from: vi.fn().mockReturnValue({
						where: vi.fn().mockReturnValue({
							limit: vi.fn().mockResolvedValue([{ id: "usr_123" }]),
						}),
					}),
				}),
			};
			vi.mocked(getDb).mockResolvedValue(mockDb as never);

			// Act
			const result = await service.exists("usr_123");

			// Assert
			expect(result).toBe(true);
		});

		it("returns false when record does not exist", async () => {
			// Arrange
			const mockDb = {
				select: vi.fn().mockReturnValue({
					from: vi.fn().mockReturnValue({
						where: vi.fn().mockReturnValue({
							limit: vi.fn().mockResolvedValue([]),
						}),
					}),
				}),
			};
			vi.mocked(getDb).mockResolvedValue(mockDb as never);

			// Act
			const result = await service.exists("usr_123");

			// Assert
			expect(result).toBe(false);
		});

		it("throws parsed D1DatabaseError on database failure", async () => {
			// Arrange
			const mockDb = {
				select: vi.fn().mockReturnValue({
					from: vi.fn().mockReturnValue({
						where: vi.fn().mockReturnValue({
							limit: vi.fn().mockRejectedValue(new Error("D1 query failure")),
						}),
					}),
				}),
			};
			vi.mocked(getDb).mockResolvedValue(mockDb as never);

			// Act & Assert
			await expect(service.exists("usr_123")).rejects.toThrow(D1DatabaseError);
		});
	});

	describe("count", () => {
		it("returns numeric count from query", async () => {
			// Arrange
			const mockDb = {
				select: vi.fn().mockReturnValue({
					from: vi.fn().mockResolvedValue([{ count: 42 }]),
				}),
			};
			vi.mocked(getDb).mockResolvedValue(mockDb as never);

			// Act
			const result = await service.count();

			// Assert
			expect(result).toBe(42);
		});

		it("returns 0 when count result is empty", async () => {
			// Arrange
			const mockDb = {
				select: vi.fn().mockReturnValue({
					from: vi.fn().mockResolvedValue([]),
				}),
			};
			vi.mocked(getDb).mockResolvedValue(mockDb as never);

			// Act
			const result = await service.count();

			// Assert
			expect(result).toBe(0);
		});

		it("throws parsed D1DatabaseError on count failure", async () => {
			// Arrange
			const mockDb = {
				select: vi.fn().mockReturnValue({
					from: vi.fn().mockRejectedValue(new Error("D1 count error")),
				}),
			};
			vi.mocked(getDb).mockResolvedValue(mockDb as never);

			// Act & Assert
			await expect(service.count()).rejects.toThrow(D1DatabaseError);
		});
	});

	describe("create", () => {
		it("inserts and returns created record", async () => {
			// Arrange
			const newUserData = {
				email: "new@example.com",
				name: "New User",
			};
			const createdRecord = {
				...newUserData,
				id: "usr_created",
			};
			const mockDb = {
				insert: vi.fn().mockReturnValue({
					values: vi.fn().mockReturnValue({
						returning: vi.fn().mockResolvedValue([createdRecord]),
					}),
				}),
			};
			vi.mocked(getDb).mockResolvedValue(mockDb as never);

			// Act
			const result = await service.create(newUserData as never);

			// Assert
			expect(result).toEqual(createdRecord);
		});

		it("throws parsed D1DatabaseError on unique constraint failure", async () => {
			// Arrange
			const mockDb = {
				insert: vi.fn().mockReturnValue({
					values: vi.fn().mockReturnValue({
						returning: vi
							.fn()
							.mockRejectedValue(
								new Error("UNIQUE constraint failed: user.email"),
							),
					}),
				}),
			};
			vi.mocked(getDb).mockResolvedValue(mockDb as never);

			// Act & Assert
			await expect(
				service.create({ email: "dup@example.com" } as never),
			).rejects.toMatchObject({
				column: "email",
				kind: D1ErrorKind.UNIQUE_VIOLATION,
				table: "user",
			});
		});
	});

	describe("update", () => {
		it("updates and returns updated record", async () => {
			// Arrange
			const updatedRecord = {
				email: "updated@example.com",
				id: "usr_123",
				name: "Updated Name",
			};
			const mockDb = {
				update: vi.fn().mockReturnValue({
					set: vi.fn().mockReturnValue({
						where: vi.fn().mockReturnValue({
							returning: vi.fn().mockResolvedValue([updatedRecord]),
						}),
					}),
				}),
			};
			vi.mocked(getDb).mockResolvedValue(mockDb as never);

			// Act
			const result = await service.update("usr_123", { name: "Updated Name" });

			// Assert
			expect(result).toEqual(updatedRecord);
		});

		it("returns null when no record was updated", async () => {
			// Arrange
			const mockDb = {
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
			const result = await service.update("usr_missing", {
				name: "Non-existent",
			});

			// Assert
			expect(result).toBeNull();
		});

		it("throws parsed D1DatabaseError on update failure", async () => {
			// Arrange
			const mockDb = {
				update: vi.fn().mockReturnValue({
					set: vi.fn().mockReturnValue({
						where: vi.fn().mockReturnValue({
							returning: vi
								.fn()
								.mockRejectedValue(new Error("D1 update error")),
						}),
					}),
				}),
			};
			vi.mocked(getDb).mockResolvedValue(mockDb as never);

			// Act & Assert
			await expect(
				service.update("usr_123", { name: "Error Test" }),
			).rejects.toThrow(D1DatabaseError);
		});
	});

	describe("upsert", () => {
		it("upserts and returns record", async () => {
			// Arrange
			const upsertData = {
				email: "upsert@example.com",
				id: "usr_upsert",
				name: "Upsert User",
			};
			const mockDb = {
				insert: vi.fn().mockReturnValue({
					values: vi.fn().mockReturnValue({
						onConflictDoUpdate: vi.fn().mockReturnValue({
							returning: vi.fn().mockResolvedValue([upsertData]),
						}),
					}),
				}),
			};
			vi.mocked(getDb).mockResolvedValue(mockDb as never);

			// Act
			const result = await service.upsert(upsertData as never);

			// Assert
			expect(result).toEqual(upsertData);
		});

		it("throws parsed D1DatabaseError on upsert failure", async () => {
			// Arrange
			const mockDb = {
				insert: vi.fn().mockReturnValue({
					values: vi.fn().mockReturnValue({
						onConflictDoUpdate: vi.fn().mockReturnValue({
							returning: vi
								.fn()
								.mockRejectedValue(new Error("D1 upsert failure")),
						}),
					}),
				}),
			};
			vi.mocked(getDb).mockResolvedValue(mockDb as never);

			// Act & Assert
			await expect(
				service.upsert({ email: "upsert@example.com" } as never),
			).rejects.toThrow(D1DatabaseError);
		});
	});

	describe("delete", () => {
		it("returns true when record was deleted", async () => {
			// Arrange
			const mockDb = {
				delete: vi.fn().mockReturnValue({
					where: vi.fn().mockReturnValue({
						returning: vi.fn().mockResolvedValue([{ id: "usr_123" }]),
					}),
				}),
			};
			vi.mocked(getDb).mockResolvedValue(mockDb as never);

			// Act
			const result = await service.delete("usr_123");

			// Assert
			expect(result).toBe(true);
		});

		it("returns false when record was not found to delete", async () => {
			// Arrange
			const mockDb = {
				delete: vi.fn().mockReturnValue({
					where: vi.fn().mockReturnValue({
						returning: vi.fn().mockResolvedValue([]),
					}),
				}),
			};
			vi.mocked(getDb).mockResolvedValue(mockDb as never);

			// Act
			const result = await service.delete("usr_missing");

			// Assert
			expect(result).toBe(false);
		});

		it("throws parsed D1DatabaseError on delete failure", async () => {
			// Arrange
			const mockDb = {
				delete: vi.fn().mockReturnValue({
					where: vi.fn().mockReturnValue({
						returning: vi.fn().mockRejectedValue(new Error("D1 delete error")),
					}),
				}),
			};
			vi.mocked(getDb).mockResolvedValue(mockDb as never);

			// Act & Assert
			await expect(service.delete("usr_123")).rejects.toThrow(D1DatabaseError);
		});
	});
});
