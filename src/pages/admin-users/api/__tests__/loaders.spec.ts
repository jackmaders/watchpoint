import type { QueryClient } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { queryKeys } from "@/shared/api";

vi.mock("../server-fns");

import { adminUsersQueryOptions, loadAdminUsers } from "../loaders";
import { getAdminUsers } from "../server-fns";

describe("admin users loaders", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("adminUsersQueryOptions", () => {
		it("constructs query options with canonical queryKey and fetcher", async () => {
			// Arrange
			const mockUsers = [{ email: "test@example.com", id: "u1" }] as never;
			vi.mocked(getAdminUsers).mockResolvedValueOnce(mockUsers);

			// Act
			const options = adminUsersQueryOptions();
			const result = await (options.queryFn as () => Promise<unknown>)();

			// Assert
			expect(options.queryKey).toEqual(queryKeys.users);
			expect(getAdminUsers).toHaveBeenCalledWith({ data: {} });
			expect(result).toEqual(mockUsers);
		});
	});

	describe("loadAdminUsers", () => {
		it("warms query cache with staleTime static", async () => {
			// Arrange
			const mockQueryClient = {
				query: vi.fn().mockResolvedValueOnce([]),
			} as unknown as QueryClient;

			// Act
			await loadAdminUsers({ context: { queryClient: mockQueryClient } });

			// Assert
			expect(mockQueryClient.query).toHaveBeenCalledWith(
				expect.objectContaining({
					queryKey: queryKeys.users,
					staleTime: "static",
				}),
			);
		});
	});
});
