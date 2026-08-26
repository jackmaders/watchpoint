import { beforeEach, describe, expect, it, vi } from "vitest";
import { getDb } from "../../client/client";
import { scenarioTableService, vodTableService } from "../service";

vi.mock("../../client/client");
vi.mock("../../audit/repository");

describe("vods domain service", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("vodTableService & scenarioTableService instances", () => {
		it("provides standard table service operations for vods", async () => {
			// Arrange
			const mockVod = {
				id: "vod_base_1",
				title: "Base VOD",
			};
			const mockDb = {
				select: vi.fn().mockReturnValue({
					from: vi.fn().mockReturnValue({
						where: vi.fn().mockReturnValue({
							limit: vi.fn().mockResolvedValue([mockVod]),
						}),
					}),
				}),
			};
			vi.mocked(getDb).mockResolvedValue(mockDb as never);

			// Act
			const result = await vodTableService.getById("vod_base_1");

			// Assert
			expect(result).toEqual(mockVod);
		});

		it("provides standard table service operations for scenarios", async () => {
			// Arrange
			const mockScenario = {
				id: "sc_base_1",
				promptText: "Base prompt",
			};
			const mockDb = {
				select: vi.fn().mockReturnValue({
					from: vi.fn().mockReturnValue({
						where: vi.fn().mockReturnValue({
							limit: vi.fn().mockResolvedValue([mockScenario]),
						}),
					}),
				}),
			};
			vi.mocked(getDb).mockResolvedValue(mockDb as never);

			// Act
			const result = await scenarioTableService.getById("sc_base_1");

			// Assert
			expect(result).toEqual(mockScenario);
		});
	});
});
