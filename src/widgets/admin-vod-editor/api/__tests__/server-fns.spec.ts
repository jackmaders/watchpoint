import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@tanstack/react-start");
vi.mock("@/shared/db");
vi.mock("@/shared/lib/permissions");

import { vodService } from "@/shared/db";
import { requirePermission } from "@/shared/lib/permissions";
import {
	bulkDeleteVods,
	bulkPublishVods,
	createScenario,
	createVod,
	deleteScenario,
	deleteVod,
	getAdminVodById,
	getAdminVods,
	reorderScenarios,
	setVodPublicationStatus,
	updateScenario,
	updateVod,
} from "../server-fns";

describe("admin-content server functions", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("getAdminVods", () => {
		it("returns VODs when invoked by authorized administrator", async () => {
			// Arrange
			const mockVods = [{ id: "v1", title: "Test VOD" }];
			vi.mocked(requirePermission).mockResolvedValueOnce({
				id: "admin_1",
				role: "ADMIN",
			});
			vi.mocked(vodService.listAdmin).mockResolvedValueOnce({
				data: {
					items: mockVods,
					page: 1,
					pageSize: 10,
					total: 1,
					totalPages: 1,
				},
				success: true,
			} as never);

			// Act
			const result = await (
				getAdminVods as unknown as (ctx: {
					data: { role?: "SUPPORT"; search?: string };
				}) => Promise<unknown>
			)({ data: { role: "SUPPORT", search: "Ana" } });

			// Assert
			expect(requirePermission).toHaveBeenCalledWith("catalog:manage");
			expect(vodService.listAdmin).toHaveBeenCalledWith({
				role: "SUPPORT",
				search: "Ana",
			});
			expect(result).toEqual(mockVods);
		});

		it("handles default undefined payload", async () => {
			// Arrange
			vi.mocked(requirePermission).mockResolvedValueOnce({
				id: "admin_1",
				role: "ADMIN",
			});
			vi.mocked(vodService.listAdmin).mockResolvedValueOnce({
				data: { items: [], page: 1, pageSize: 10, total: 0, totalPages: 1 },
				success: true,
			} as never);

			// Act
			const result = await (
				getAdminVods as unknown as (ctx: { data: unknown }) => Promise<unknown>
			)({ data: undefined });

			// Assert
			expect(result).toEqual([]);
		});

		it("throws error for invalid query payload", async () => {
			// Arrange
			const invalid = { role: "INVALID_ROLE" };

			// Act & Assert
			await expect(
				(
					getAdminVods as unknown as (ctx: {
						data: unknown;
					}) => Promise<unknown>
				)({ data: invalid }),
			).rejects.toThrow("Invalid query payload");
		});

		it("throws error when dbGetAdminVods fails", async () => {
			// Arrange
			vi.mocked(requirePermission).mockResolvedValueOnce({
				id: "admin_1",
				role: "ADMIN",
			});
			vi.mocked(vodService.listAdmin).mockResolvedValueOnce({
				error: "Failed to load VODs",
				success: false,
			});

			// Act & Assert
			await expect(
				(
					getAdminVods as unknown as (ctx: {
						data: unknown;
					}) => Promise<unknown>
				)({ data: {} }),
			).rejects.toThrow("Failed to load VODs");
		});

		it("throws 403 Forbidden when invoked by regular player", async () => {
			// Arrange
			vi.mocked(requirePermission).mockRejectedValueOnce(
				new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 }),
			);

			// Act & Assert
			await expect(
				(
					getAdminVods as unknown as (ctx: {
						data: unknown;
					}) => Promise<unknown>
				)({ data: {} }),
			).rejects.toSatisfy((res: Response) => res.status === 403);
		});

		it("throws 401 Unauthorized when invoked without session", async () => {
			// Arrange
			vi.mocked(requirePermission).mockRejectedValueOnce(
				new Response(JSON.stringify({ error: "Unauthorized" }), {
					status: 401,
				}),
			);

			// Act & Assert
			await expect(
				(
					getAdminVods as unknown as (ctx: {
						data: unknown;
					}) => Promise<unknown>
				)({ data: {} }),
			).rejects.toSatisfy((res: Response) => res.status === 401);
		});
	});

	describe("getAdminVodById", () => {
		it("returns VOD details when authorized", async () => {
			// Arrange
			const mockVod = { id: "v1", title: "Test VOD" };
			vi.mocked(requirePermission).mockResolvedValueOnce({
				id: "admin_1",
				role: "ADMIN",
			});
			vi.mocked(vodService.getById).mockResolvedValueOnce({
				data: mockVod,
				success: true,
			} as never);

			// Act
			const result = await (
				getAdminVodById as unknown as (ctx: {
					data: { id: string };
				}) => Promise<unknown>
			)({ data: { id: "v1" } });

			// Assert
			expect(requirePermission).toHaveBeenCalledWith("catalog:manage");
			expect(vodService.getById).toHaveBeenCalledWith({ id: "v1" });
			expect(result).toEqual(mockVod);
		});

		it("throws error when dbGetVodById fails", async () => {
			// Arrange
			vi.mocked(requirePermission).mockResolvedValueOnce({
				id: "admin_1",
				role: "ADMIN",
			});
			vi.mocked(vodService.getById).mockResolvedValueOnce({
				error: "VOD query failed",
				success: false,
			});

			// Act & Assert
			await expect(
				(
					getAdminVodById as unknown as (ctx: {
						data: unknown;
					}) => Promise<unknown>
				)({ data: { id: "v1" } }),
			).rejects.toThrow("VOD query failed");
		});

		it("throws error for invalid ID payload", async () => {
			// Arrange
			const invalid = { id: "" };

			// Act & Assert
			await expect(
				(
					getAdminVodById as unknown as (ctx: {
						data: unknown;
					}) => Promise<unknown>
				)({ data: invalid }),
			).rejects.toThrow("Invalid VOD ID payload");
		});
	});

	describe("createVod", () => {
		it("creates VOD when authorized as admin", async () => {
			// Arrange
			const input = {
				durationSeconds: 600,
				heroName: "Ana",
				mapName: "King's Row",
				rankTier: "Grandmaster",
				role: "SUPPORT" as const,
				title: "GM Ana",
				youtubeVideoId: "abc12345",
			};
			vi.mocked(requirePermission).mockResolvedValueOnce({
				id: "admin_1",
				role: "ADMIN",
			});
			vi.mocked(vodService.create).mockResolvedValueOnce({
				data: { ...input, id: "v1", isPublished: false } as never,
				success: true,
			});

			// Act
			const result = await (
				createVod as unknown as (ctx: { data: unknown }) => Promise<unknown>
			)({ data: input });

			// Assert
			expect(requirePermission).toHaveBeenCalledWith("catalog:manage");
			expect(vodService.create).toHaveBeenCalledWith({
				...input,
				actorUserId: "admin_1",
			});
			expect(result).toEqual({
				data: { ...input, id: "v1", isPublished: false },
				success: true,
			});
		});

		it("throws error for invalid create payload", async () => {
			// Arrange
			const invalid = { title: "" };

			// Act & Assert
			await expect(
				(createVod as unknown as (ctx: { data: unknown }) => Promise<unknown>)({
					data: invalid,
				}),
			).rejects.toThrow("Invalid create VOD payload");
		});
	});

	describe("updateVod", () => {
		it("updates VOD with manage permission when isPublished not changed", async () => {
			// Arrange
			const input = { id: "v1", title: "New Title" };
			vi.mocked(requirePermission).mockResolvedValueOnce({
				id: "admin_1",
				role: "ADMIN",
			});
			vi.mocked(vodService.update).mockResolvedValueOnce({
				data: { id: "v1", title: "New Title" } as never,
				success: true,
			});

			// Act
			const result = await (
				updateVod as unknown as (ctx: { data: unknown }) => Promise<unknown>
			)({ data: input });

			// Assert
			expect(requirePermission).toHaveBeenCalledWith("catalog:manage");
			expect(vodService.update).toHaveBeenCalledWith({
				...input,
				actorUserId: "admin_1",
			});
			expect(result).toEqual({
				data: { id: "v1", title: "New Title" },
				success: true,
			});
		});

		it("updates VOD with publish permission when isPublished is provided", async () => {
			// Arrange
			const input = { id: "v1", isPublished: true };
			vi.mocked(requirePermission).mockResolvedValueOnce({
				id: "admin_1",
				role: "ADMIN",
			});
			vi.mocked(vodService.update).mockResolvedValueOnce({
				data: { id: "v1", isPublished: true } as never,
				success: true,
			});

			// Act
			const result = await (
				updateVod as unknown as (ctx: { data: unknown }) => Promise<unknown>
			)({ data: input });

			// Assert
			expect(requirePermission).toHaveBeenCalledWith("catalog:publish");
			expect(result).toEqual({
				data: { id: "v1", isPublished: true },
				success: true,
			});
		});

		it("throws error for invalid update payload", async () => {
			// Arrange
			const invalid = { id: "" };

			// Act & Assert
			await expect(
				(updateVod as unknown as (ctx: { data: unknown }) => Promise<unknown>)({
					data: invalid,
				}),
			).rejects.toThrow("Invalid update VOD payload");
		});
	});

	describe("deleteVod", () => {
		it("deletes VOD when authorized", async () => {
			// Arrange
			vi.mocked(requirePermission).mockResolvedValueOnce({
				id: "admin_1",
				role: "ADMIN",
			});
			vi.mocked(vodService.delete).mockResolvedValueOnce({
				data: undefined,
				success: true,
			});

			// Act
			const result = await (
				deleteVod as unknown as (ctx: { data: unknown }) => Promise<unknown>
			)({ data: { id: "v1" } });

			// Assert
			expect(requirePermission).toHaveBeenCalledWith("catalog:manage");
			expect(vodService.delete).toHaveBeenCalledWith({
				actorUserId: "admin_1",
				id: "v1",
			});
			expect(result).toEqual({ data: undefined, success: true });
		});

		it("throws error for invalid delete payload", async () => {
			// Arrange
			const invalid = { id: "" };

			// Act & Assert
			await expect(
				(deleteVod as unknown as (ctx: { data: unknown }) => Promise<unknown>)({
					data: invalid,
				}),
			).rejects.toThrow("Invalid delete VOD payload");
		});
	});

	describe("setVodPublicationStatus", () => {
		it("sets publication status with catalog:publish permission", async () => {
			// Arrange
			vi.mocked(requirePermission).mockResolvedValueOnce({
				id: "admin_1",
				role: "ADMIN",
			});
			vi.mocked(vodService.setPublicationStatus).mockResolvedValueOnce({
				data: { id: "v1", isPublished: true } as never,
				success: true,
			});

			// Act
			const result = await (
				setVodPublicationStatus as unknown as (ctx: {
					data: unknown;
				}) => Promise<unknown>
			)({ data: { id: "v1", isPublished: true } });

			// Assert
			expect(requirePermission).toHaveBeenCalledWith("catalog:publish");
			expect(vodService.setPublicationStatus).toHaveBeenCalledWith({
				actorUserId: "admin_1",
				id: "v1",
				isPublished: true,
			});
			expect(result).toEqual({
				data: { id: "v1", isPublished: true },
				success: true,
			});
		});

		it("throws error for invalid payload", async () => {
			// Arrange
			const invalid = { id: "", isPublished: "invalid" };

			// Act & Assert
			await expect(
				(
					setVodPublicationStatus as unknown as (ctx: {
						data: unknown;
					}) => Promise<unknown>
				)({ data: invalid }),
			).rejects.toThrow("Invalid publication status payload");
		});
	});

	describe("bulkPublishVods and bulkDeleteVods", () => {
		it("executes bulk publish when authorized", async () => {
			// Arrange
			vi.mocked(requirePermission).mockResolvedValueOnce({
				id: "admin_1",
				role: "ADMIN",
			});
			vi.mocked(vodService.bulkPublish).mockResolvedValueOnce({
				data: {
					failed: [],
					succeeded: ["v1", "v2"],
				},
				success: true,
			});

			// Act
			const result = await (
				bulkPublishVods as unknown as (ctx: {
					data: unknown;
				}) => Promise<unknown>
			)({ data: { ids: ["v1", "v2"], isPublished: true } });

			// Assert
			expect(requirePermission).toHaveBeenCalledWith("catalog:publish");
			expect(result).toEqual({
				data: { failed: [], succeeded: ["v1", "v2"] },
				success: true,
			});
		});

		it("throws error for invalid bulk publish payload", async () => {
			// Arrange
			const invalid = { ids: [], isPublished: true };

			// Act & Assert
			await expect(
				(
					bulkPublishVods as unknown as (ctx: {
						data: unknown;
					}) => Promise<unknown>
				)({ data: invalid }),
			).rejects.toThrow("Invalid bulk publish payload");
		});

		it("executes bulk delete when authorized", async () => {
			// Arrange
			vi.mocked(requirePermission).mockResolvedValueOnce({
				id: "admin_1",
				role: "ADMIN",
			});
			vi.mocked(vodService.bulkDelete).mockResolvedValueOnce({
				data: {
					failed: [],
					succeeded: ["v1"],
				},
				success: true,
			});

			// Act
			const result = await (
				bulkDeleteVods as unknown as (ctx: {
					data: unknown;
				}) => Promise<unknown>
			)({ data: { ids: ["v1"] } });

			// Assert
			expect(requirePermission).toHaveBeenCalledWith("catalog:manage");
			expect(result).toEqual({
				data: { failed: [], succeeded: ["v1"] },
				success: true,
			});
		});

		it("throws error for invalid bulk delete payload", async () => {
			// Arrange
			const invalid = { ids: [] };

			// Act & Assert
			await expect(
				(
					bulkDeleteVods as unknown as (ctx: {
						data: unknown;
					}) => Promise<unknown>
				)({ data: invalid }),
			).rejects.toThrow("Invalid bulk delete payload");
		});
	});

	describe("scenario mutations", () => {
		it("creates scenario with catalog:manage permission", async () => {
			// Arrange
			const scenarioInput = {
				explanationText: "Exp",
				imageUrl: null,
				inputConfig: { options: [{ id: "1", is_correct: true, text: "A" }] },
				inputType: "MULTIPLE_CHOICE" as const,
				moduleType: "STRATEGY" as const,
				promptText: "Prompt",
				timeLimitSeconds: null,
				timestampSeconds: 50,
				vodId: "v1",
			};
			vi.mocked(requirePermission).mockResolvedValueOnce({
				id: "admin_1",
				role: "ADMIN",
			});
			vi.mocked(vodService.createScenario).mockResolvedValueOnce({
				data: { ...scenarioInput, id: "s1" } as never,
				success: true,
			});

			// Act
			const result = await (
				createScenario as unknown as (ctx: {
					data: unknown;
				}) => Promise<unknown>
			)({ data: scenarioInput });

			// Assert
			expect(requirePermission).toHaveBeenCalledWith("catalog:manage");
			expect(vodService.createScenario).toHaveBeenCalledWith({
				...scenarioInput,
				actorUserId: "admin_1",
			});
			expect(result).toEqual({
				data: { ...scenarioInput, id: "s1" },
				success: true,
			});
		});

		it("throws error for invalid create scenario payload", async () => {
			// Arrange
			const invalid = { promptText: "" };

			// Act & Assert
			await expect(
				(
					createScenario as unknown as (ctx: {
						data: unknown;
					}) => Promise<unknown>
				)({ data: invalid }),
			).rejects.toThrow("Invalid create scenario payload");
		});

		it("updates scenario with catalog:manage permission", async () => {
			// Arrange
			const updateInput = { id: "s1", promptText: "New Prompt" };
			vi.mocked(requirePermission).mockResolvedValueOnce({
				id: "admin_1",
				role: "ADMIN",
			});
			vi.mocked(vodService.updateScenario).mockResolvedValueOnce({
				data: { id: "s1", promptText: "New Prompt" } as never,
				success: true,
			});

			// Act
			const result = await (
				updateScenario as unknown as (ctx: {
					data: unknown;
				}) => Promise<unknown>
			)({ data: updateInput });

			// Assert
			expect(requirePermission).toHaveBeenCalledWith("catalog:manage");
			expect(vodService.updateScenario).toHaveBeenCalledWith({
				...updateInput,
				actorUserId: "admin_1",
			});
			expect(result).toEqual({
				data: { id: "s1", promptText: "New Prompt" },
				success: true,
			});
		});

		it("throws error for invalid update scenario payload", async () => {
			// Arrange
			const invalid = { id: "" };

			// Act & Assert
			await expect(
				(
					updateScenario as unknown as (ctx: {
						data: unknown;
					}) => Promise<unknown>
				)({ data: invalid }),
			).rejects.toThrow("Invalid update scenario payload");
		});

		it("deletes scenario with catalog:manage permission", async () => {
			// Arrange
			vi.mocked(requirePermission).mockResolvedValueOnce({
				id: "admin_1",
				role: "ADMIN",
			});
			vi.mocked(vodService.deleteScenario).mockResolvedValueOnce({
				data: undefined,
				success: true,
			});

			// Act
			const result = await (
				deleteScenario as unknown as (ctx: {
					data: unknown;
				}) => Promise<unknown>
			)({ data: { id: "s1" } });

			// Assert
			expect(requirePermission).toHaveBeenCalledWith("catalog:manage");
			expect(vodService.deleteScenario).toHaveBeenCalledWith({
				actorUserId: "admin_1",
				id: "s1",
			});
			expect(result).toEqual({ data: undefined, success: true });
		});

		it("throws error for invalid delete scenario payload", async () => {
			// Arrange
			const invalid = { id: "" };

			// Act & Assert
			await expect(
				(
					deleteScenario as unknown as (ctx: {
						data: unknown;
					}) => Promise<unknown>
				)({ data: invalid }),
			).rejects.toThrow("Invalid delete scenario payload");
		});

		it("reorders scenarios with catalog:manage permission", async () => {
			// Arrange
			const reorderInput = {
				scenarioOrders: [{ id: "s1", timestampSeconds: 20 }],
				vodId: "v1",
			};
			vi.mocked(requirePermission).mockResolvedValueOnce({
				id: "admin_1",
				role: "ADMIN",
			});
			vi.mocked(vodService.reorderScenarios).mockResolvedValueOnce({
				data: undefined,
				success: true,
			});

			// Act
			const result = await (
				reorderScenarios as unknown as (ctx: {
					data: unknown;
				}) => Promise<unknown>
			)({ data: reorderInput });

			// Assert
			expect(requirePermission).toHaveBeenCalledWith("catalog:manage");
			expect(vodService.reorderScenarios).toHaveBeenCalledWith({
				...reorderInput,
				actorUserId: "admin_1",
			});
			expect(result).toEqual({ data: undefined, success: true });
		});

		it("throws error for invalid reorder scenario payload", async () => {
			// Arrange
			const invalid = { scenarioOrders: [], vodId: "" };

			// Act & Assert
			await expect(
				(
					reorderScenarios as unknown as (ctx: {
						data: unknown;
					}) => Promise<unknown>
				)({ data: invalid }),
			).rejects.toThrow("Invalid reorder scenarios payload");
		});
	});
});
