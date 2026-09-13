import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook } from "@testing-library/react";
import type React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { queryKeys } from "@/shared/api";

vi.mock("../server-fns");

import {
	adminUsersQueryOptions,
	loadAdminUsers,
	useUpdateUserRole,
} from "../loaders";
import { getAdminUsers, updateUserRole } from "../server-fns";

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

	describe("useUpdateUserRole", () => {
		it("calls updateUserRole on mutate and invalidates users query key on success", async () => {
			// Arrange
			const queryClient = new QueryClient();
			const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
			vi.mocked(updateUserRole).mockResolvedValueOnce({
				status: "success",
				user: { id: "u1" } as never,
			});

			const wrapper = ({ children }: { children: React.ReactNode }) => (
				<QueryClientProvider client={queryClient}>
					{children}
				</QueryClientProvider>
			);

			const { result } = renderHook(() => useUpdateUserRole(), { wrapper });

			// Act
			await act(async () => {
				await result.current.mutateAsync({
					newRole: "ADMIN",
					targetUserId: "u1",
				});
			});

			// Assert
			expect(updateUserRole).toHaveBeenCalledWith({
				data: { newRole: "ADMIN", targetUserId: "u1" },
			});
			expect(invalidateSpy).toHaveBeenCalledWith({
				queryKey: queryKeys.users,
			});
		});
	});
});
