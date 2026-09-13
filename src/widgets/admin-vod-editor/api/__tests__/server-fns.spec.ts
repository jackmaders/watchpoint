import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@tanstack/react-start");
vi.mock("@/shared/lib/permissions");
vi.mock("../../model/vod-rules");
vi.mock("../../model/scenario-rules");
vi.mock("../../model/get-admin-vods");

import { requirePermission } from "@/shared/lib/permissions";
import {
	bulkDeleteVodsRule,
	bulkPublishVodsRule,
	createScenarioRule,
	createVodRule,
	deleteScenarioRule,
	deleteVodRule,
	getAdminVodByIdRule,
	getAdminVodsRule,
	reorderScenariosRule,
	setVodPublicationStatusRule,
	updateScenarioRule,
	updateVodRule,
} from "../../model";
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

describe("admin-vod-editor server functions", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("getAdminVods", () => {
		it("delegates to getAdminVodsRule when authorized", async () => {
			// Arrange
			const mockVods = [{ id: "v1", scenarios: [], title: "Test VOD" }];
			vi.mocked(requirePermission).mockResolvedValueOnce({
				email: "admin@example.com",
				id: "admin_1",
				name: "Admin",
				role: "ADMIN",
			});
			vi.mocked(getAdminVodsRule).mockResolvedValueOnce(mockVods as never);

			// Act
			const result = await (
				getAdminVods as unknown as (ctx: {
					data: { role?: "SUPPORT"; search?: string };
				}) => Promise<unknown>
			)({ data: { role: "SUPPORT", search: "Ana" } });

			// Assert
			expect(requirePermission).toHaveBeenCalledWith("catalog:manage");
			expect(getAdminVodsRule).toHaveBeenCalledWith({
				role: "SUPPORT",
				search: "Ana",
			});
			expect(result).toEqual(mockVods);
		});

		it("handles default undefined payload in validator", async () => {
			vi.mocked(requirePermission).mockResolvedValueOnce({
				email: "admin@example.com",
				id: "admin_1",
				name: "Admin",
				role: "ADMIN",
			});
			vi.mocked(getAdminVodsRule).mockResolvedValueOnce([]);

			const result = await (
				getAdminVods as unknown as (ctx: { data?: unknown }) => Promise<unknown>
			)({ data: undefined });

			expect(result).toEqual([]);
		});

		it("throws error on invalid query payload", async () => {
			await expect(
				(
					getAdminVods as unknown as (ctx: {
						data: unknown;
					}) => Promise<unknown>
				)({ data: { role: "INVALID" } }),
			).rejects.toThrow("Invalid query payload");
		});
	});

	describe("getAdminVodById", () => {
		it("delegates to getAdminVodByIdRule when authorized", async () => {
			// Arrange
			const mockVod = { id: "v1", scenarios: [], title: "Test VOD" };
			vi.mocked(requirePermission).mockResolvedValueOnce({
				email: "admin@example.com",
				id: "admin_1",
				name: "Admin",
				role: "ADMIN",
			});
			vi.mocked(getAdminVodByIdRule).mockResolvedValueOnce(mockVod as never);

			// Act
			const result = await (
				getAdminVodById as unknown as (ctx: {
					data: { id: string };
				}) => Promise<unknown>
			)({ data: { id: "v1" } });

			// Assert
			expect(requirePermission).toHaveBeenCalledWith("catalog:manage");
			expect(getAdminVodByIdRule).toHaveBeenCalledWith({ id: "v1" });
			expect(result).toEqual(mockVod);
		});

		it("throws error on invalid id payload", async () => {
			await expect(
				(
					getAdminVodById as unknown as (ctx: {
						data: unknown;
					}) => Promise<unknown>
				)({ data: { id: "" } }),
			).rejects.toThrow("Invalid VOD ID payload");
		});
	});

	describe("createVod", () => {
		it("delegates to createVodRule with actorUserId", async () => {
			// Arrange
			vi.mocked(requirePermission).mockResolvedValueOnce({
				email: "admin@example.com",
				id: "admin_1",
				name: "Admin",
				role: "ADMIN",
			});
			vi.mocked(createVodRule).mockResolvedValueOnce({
				status: "success",
				vod: { id: "v1" } as never,
			});

			const payload = {
				durationSeconds: 300,
				heroName: "Ana",
				mapName: "Dorado",
				rankTier: "Diamond",
				role: "SUPPORT" as const,
				title: "Ana VOD",
				youtubeVideoId: "yt-1",
			};

			// Act
			const result = await (
				createVod as unknown as (ctx: {
					data: typeof payload;
				}) => Promise<unknown>
			)({ data: payload });

			// Assert
			expect(requirePermission).toHaveBeenCalledWith("catalog:manage");
			expect(createVodRule).toHaveBeenCalledWith({
				...payload,
				actorUserId: "admin_1",
			});
			expect(result).toEqual({ status: "success", vod: { id: "v1" } });
		});

		it("throws error on invalid create payload", async () => {
			await expect(
				(createVod as unknown as (ctx: { data: unknown }) => Promise<unknown>)({
					data: {},
				}),
			).rejects.toThrow("Invalid create VOD payload");
		});
	});

	describe("updateVod", () => {
		it("delegates to updateVodRule with actorUserId", async () => {
			// Arrange
			vi.mocked(requirePermission).mockResolvedValueOnce({
				email: "admin@example.com",
				id: "admin_1",
				name: "Admin",
				role: "ADMIN",
			});
			vi.mocked(updateVodRule).mockResolvedValueOnce({
				status: "success",
				vod: { id: "v1" } as never,
			});

			// Act
			const result = await (
				updateVod as unknown as (ctx: {
					data: { id: string; title: string };
				}) => Promise<unknown>
			)({ data: { id: "v1", title: "New" } });

			// Assert
			expect(requirePermission).toHaveBeenCalledWith("catalog:manage");
			expect(updateVodRule).toHaveBeenCalledWith({
				actorUserId: "admin_1",
				id: "v1",
				title: "New",
			});
			expect(result).toEqual({ status: "success", vod: { id: "v1" } });
		});

		it("uses catalog:publish permission when isPublished is present", async () => {
			// Arrange
			vi.mocked(requirePermission).mockResolvedValueOnce({
				email: "admin@example.com",
				id: "admin_1",
				name: "Admin",
				role: "ADMIN",
			});
			vi.mocked(updateVodRule).mockResolvedValueOnce({
				status: "success",
				vod: { id: "v1" } as never,
			});

			// Act
			await (
				updateVod as unknown as (ctx: {
					data: { id: string; isPublished: boolean };
				}) => Promise<unknown>
			)({ data: { id: "v1", isPublished: true } });

			// Assert
			expect(requirePermission).toHaveBeenCalledWith("catalog:publish");
		});

		it("throws error on invalid update payload", async () => {
			await expect(
				(updateVod as unknown as (ctx: { data: unknown }) => Promise<unknown>)({
					data: { id: "" },
				}),
			).rejects.toThrow("Invalid update VOD payload");
		});
	});

	describe("deleteVod", () => {
		it("delegates to deleteVodRule with actorUserId", async () => {
			// Arrange
			vi.mocked(requirePermission).mockResolvedValueOnce({
				email: "admin@example.com",
				id: "admin_1",
				name: "Admin",
				role: "ADMIN",
			});
			vi.mocked(deleteVodRule).mockResolvedValueOnce({
				status: "success",
				vod: { id: "v1" } as never,
			});

			// Act
			const result = await (
				deleteVod as unknown as (ctx: {
					data: { id: string };
				}) => Promise<unknown>
			)({ data: { id: "v1" } });

			// Assert
			expect(requirePermission).toHaveBeenCalledWith("catalog:manage");
			expect(deleteVodRule).toHaveBeenCalledWith({
				actorUserId: "admin_1",
				id: "v1",
			});
			expect(result).toEqual({ status: "success", vod: { id: "v1" } });
		});

		it("throws error on invalid delete payload", async () => {
			await expect(
				(deleteVod as unknown as (ctx: { data: unknown }) => Promise<unknown>)({
					data: { id: "" },
				}),
			).rejects.toThrow("Invalid delete VOD payload");
		});
	});

	describe("setVodPublicationStatus", () => {
		it("delegates to setVodPublicationStatusRule", async () => {
			// Arrange
			vi.mocked(requirePermission).mockResolvedValueOnce({
				email: "admin@example.com",
				id: "admin_1",
				name: "Admin",
				role: "ADMIN",
			});
			vi.mocked(setVodPublicationStatusRule).mockResolvedValueOnce({
				status: "success",
				vod: { id: "v1", isPublished: true } as never,
			});

			// Act
			const result = await (
				setVodPublicationStatus as unknown as (ctx: {
					data: { id: string; isPublished: boolean };
				}) => Promise<unknown>
			)({ data: { id: "v1", isPublished: true } });

			// Assert
			expect(requirePermission).toHaveBeenCalledWith("catalog:publish");
			expect(setVodPublicationStatusRule).toHaveBeenCalledWith({
				actorUserId: "admin_1",
				id: "v1",
				isPublished: true,
			});
			expect(result).toEqual({
				status: "success",
				vod: { id: "v1", isPublished: true },
			});
		});

		it("throws error on invalid publication status payload", async () => {
			await expect(
				(
					setVodPublicationStatus as unknown as (ctx: {
						data: unknown;
					}) => Promise<unknown>
				)({ data: { id: "" } }),
			).rejects.toThrow("Invalid publication status payload");
		});
	});

	describe("bulkPublishVods", () => {
		it("delegates to bulkPublishVodsRule", async () => {
			// Arrange
			vi.mocked(requirePermission).mockResolvedValueOnce({
				email: "admin@example.com",
				id: "admin_1",
				name: "Admin",
				role: "ADMIN",
			});
			vi.mocked(bulkPublishVodsRule).mockResolvedValueOnce({
				result: { failed: [], succeeded: ["v1"] },
				status: "success",
			});

			// Act
			const result = await (
				bulkPublishVods as unknown as (ctx: {
					data: { ids: string[]; isPublished: boolean };
				}) => Promise<unknown>
			)({ data: { ids: ["v1"], isPublished: true } });

			// Assert
			expect(requirePermission).toHaveBeenCalledWith("catalog:publish");
			expect(bulkPublishVodsRule).toHaveBeenCalledWith({
				actorUserId: "admin_1",
				ids: ["v1"],
				isPublished: true,
			});
			expect(result).toEqual({
				result: { failed: [], succeeded: ["v1"] },
				status: "success",
			});
		});

		it("throws error on invalid bulk publish payload", async () => {
			await expect(
				(
					bulkPublishVods as unknown as (ctx: {
						data: unknown;
					}) => Promise<unknown>
				)({ data: { ids: [] } }),
			).rejects.toThrow("Invalid bulk publish payload");
		});
	});

	describe("bulkDeleteVods", () => {
		it("delegates to bulkDeleteVodsRule", async () => {
			// Arrange
			vi.mocked(requirePermission).mockResolvedValueOnce({
				email: "admin@example.com",
				id: "admin_1",
				name: "Admin",
				role: "ADMIN",
			});
			vi.mocked(bulkDeleteVodsRule).mockResolvedValueOnce({
				result: { failed: [], succeeded: ["v1"] },
				status: "success",
			});

			// Act
			const result = await (
				bulkDeleteVods as unknown as (ctx: {
					data: { ids: string[] };
				}) => Promise<unknown>
			)({ data: { ids: ["v1"] } });

			// Assert
			expect(requirePermission).toHaveBeenCalledWith("catalog:manage");
			expect(bulkDeleteVodsRule).toHaveBeenCalledWith({
				actorUserId: "admin_1",
				ids: ["v1"],
			});
			expect(result).toEqual({
				result: { failed: [], succeeded: ["v1"] },
				status: "success",
			});
		});

		it("throws error on invalid bulk delete payload", async () => {
			await expect(
				(
					bulkDeleteVods as unknown as (ctx: {
						data: unknown;
					}) => Promise<unknown>
				)({ data: { ids: [] } }),
			).rejects.toThrow("Invalid bulk delete payload");
		});
	});

	describe("createScenario", () => {
		it("delegates to createScenarioRule", async () => {
			// Arrange
			vi.mocked(requirePermission).mockResolvedValueOnce({
				email: "admin@example.com",
				id: "admin_1",
				name: "Admin",
				role: "ADMIN",
			});
			vi.mocked(createScenarioRule).mockResolvedValueOnce({
				scenario: { id: "s1" } as never,
				status: "success",
			});

			const payload = {
				explanationText: "expl",
				inputConfig: {},
				inputType: "MULTIPLE_CHOICE" as const,
				moduleType: "STRATEGY" as const,
				promptText: "prompt",
				timestampSeconds: 10,
				vodId: "v1",
			};

			// Act
			const result = await (
				createScenario as unknown as (ctx: {
					data: typeof payload;
				}) => Promise<unknown>
			)({ data: payload });

			// Assert
			expect(requirePermission).toHaveBeenCalledWith("catalog:manage");
			expect(createScenarioRule).toHaveBeenCalledWith({
				...payload,
				actorUserId: "admin_1",
			});
			expect(result).toEqual({ scenario: { id: "s1" }, status: "success" });
		});

		it("throws error on invalid create scenario payload", async () => {
			await expect(
				(
					createScenario as unknown as (ctx: {
						data: unknown;
					}) => Promise<unknown>
				)({ data: {} }),
			).rejects.toThrow("Invalid create scenario payload");
		});
	});

	describe("updateScenario", () => {
		it("delegates to updateScenarioRule", async () => {
			// Arrange
			vi.mocked(requirePermission).mockResolvedValueOnce({
				email: "admin@example.com",
				id: "admin_1",
				name: "Admin",
				role: "ADMIN",
			});
			vi.mocked(updateScenarioRule).mockResolvedValueOnce({
				scenario: { id: "s1" } as never,
				status: "success",
			});

			// Act
			const result = await (
				updateScenario as unknown as (ctx: {
					data: { id: string; promptText: string };
				}) => Promise<unknown>
			)({ data: { id: "s1", promptText: "New Prompt" } });

			// Assert
			expect(requirePermission).toHaveBeenCalledWith("catalog:manage");
			expect(updateScenarioRule).toHaveBeenCalledWith({
				actorUserId: "admin_1",
				id: "s1",
				promptText: "New Prompt",
			});
			expect(result).toEqual({ scenario: { id: "s1" }, status: "success" });
		});

		it("throws error on invalid update scenario payload", async () => {
			await expect(
				(
					updateScenario as unknown as (ctx: {
						data: unknown;
					}) => Promise<unknown>
				)({ data: { id: "" } }),
			).rejects.toThrow("Invalid update scenario payload");
		});
	});

	describe("deleteScenario", () => {
		it("delegates to deleteScenarioRule", async () => {
			// Arrange
			vi.mocked(requirePermission).mockResolvedValueOnce({
				email: "admin@example.com",
				id: "admin_1",
				name: "Admin",
				role: "ADMIN",
			});
			vi.mocked(deleteScenarioRule).mockResolvedValueOnce({
				scenario: { id: "s1" } as never,
				status: "success",
			});

			// Act
			const result = await (
				deleteScenario as unknown as (ctx: {
					data: { id: string };
				}) => Promise<unknown>
			)({ data: { id: "s1" } });

			// Assert
			expect(requirePermission).toHaveBeenCalledWith("catalog:manage");
			expect(deleteScenarioRule).toHaveBeenCalledWith({
				actorUserId: "admin_1",
				id: "s1",
			});
			expect(result).toEqual({ scenario: { id: "s1" }, status: "success" });
		});

		it("throws error on invalid delete scenario payload", async () => {
			await expect(
				(
					deleteScenario as unknown as (ctx: {
						data: unknown;
					}) => Promise<unknown>
				)({ data: { id: "" } }),
			).rejects.toThrow("Invalid delete scenario payload");
		});
	});

	describe("reorderScenarios", () => {
		it("delegates to reorderScenariosRule", async () => {
			// Arrange
			vi.mocked(requirePermission).mockResolvedValueOnce({
				email: "admin@example.com",
				id: "admin_1",
				name: "Admin",
				role: "ADMIN",
			});
			vi.mocked(reorderScenariosRule).mockResolvedValueOnce({
				status: "success",
			});

			// Act
			const result = await (
				reorderScenarios as unknown as (ctx: {
					data: {
						scenarioOrders: Array<{ id: string; timestampSeconds: number }>;
						vodId: string;
					};
				}) => Promise<unknown>
			)({
				data: {
					scenarioOrders: [{ id: "s1", timestampSeconds: 10 }],
					vodId: "v1",
				},
			});

			// Assert
			expect(requirePermission).toHaveBeenCalledWith("catalog:manage");
			expect(reorderScenariosRule).toHaveBeenCalledWith({
				actorUserId: "admin_1",
				scenarioOrders: [{ id: "s1", timestampSeconds: 10 }],
				vodId: "v1",
			});
			expect(result).toEqual({ status: "success" });
		});

		it("throws error on invalid reorder scenarios payload", async () => {
			await expect(
				(
					reorderScenarios as unknown as (ctx: {
						data: unknown;
					}) => Promise<unknown>
				)({ data: { scenarioOrders: [] } }),
			).rejects.toThrow("Invalid reorder scenarios payload");
		});
	});
});
