import type { QueryClient } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@tanstack/react-start");
vi.mock("@/entities/vod");
vi.mock("@/shared/lib/auth");

import { getPublishedVods } from "@/entities/vod";
import { queryKeys } from "@/shared/api";
import { isRegistrationOpen } from "@/shared/lib/auth";
import { fetchHomePage, homePageQueryOptions, loadHomePage } from "../loaders";

describe("home loaders", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("fetchHomePage", () => {
		it("loads published vods and registration status concurrently", async () => {
			// Arrange
			const mockVods = [{ id: "vod_1", title: "Test VOD" }] as never;
			vi.mocked(getPublishedVods).mockResolvedValueOnce(mockVods);
			vi.mocked(isRegistrationOpen).mockResolvedValueOnce(true);

			// Act
			const result = await (
				fetchHomePage as unknown as () => Promise<{
					registrationEnabled: boolean;
					vods: typeof mockVods;
				}>
			)();

			// Assert
			expect(getPublishedVods).toHaveBeenCalled();
			expect(isRegistrationOpen).toHaveBeenCalled();
			expect(result).toEqual({
				registrationEnabled: true,
				vods: mockVods,
			});
		});
	});

	describe("homePageQueryOptions", () => {
		it("returns query options with canonical queryKey and fetcher", async () => {
			// Arrange
			const mockData = { registrationEnabled: true, vods: [] };
			vi.mocked(getPublishedVods).mockResolvedValueOnce([] as never);
			vi.mocked(isRegistrationOpen).mockResolvedValueOnce(true);

			// Act
			const options = homePageQueryOptions();
			const result = await (options.queryFn as () => Promise<unknown>)();

			// Assert
			expect(options.queryKey).toEqual(queryKeys.home);
			expect(result).toEqual(mockData);
		});
	});

	describe("loadHomePage", () => {
		it("warms query cache with staleTime static", async () => {
			// Arrange
			const mockQueryClient = {
				query: vi.fn().mockResolvedValueOnce({
					registrationEnabled: true,
					vods: [],
				}),
			} as unknown as QueryClient;

			// Act
			await loadHomePage({ context: { queryClient: mockQueryClient } });

			// Assert
			expect(mockQueryClient.query).toHaveBeenCalledWith(
				expect.objectContaining({
					queryKey: queryKeys.home,
					staleTime: "static",
				}),
			);
		});
	});
});
