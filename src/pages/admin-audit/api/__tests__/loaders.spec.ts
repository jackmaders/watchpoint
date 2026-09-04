import type { QueryClient } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/shared/lib/audit");

import { queryKeys } from "@/shared/api";
import { getAdminAuditLogs } from "@/shared/lib/audit";
import { adminAuditQueryOptions, loadAdminAudit } from "../loaders";

describe("admin-audit loaders", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("adminAuditQueryOptions", () => {
		it("constructs query options with search parameters in queryKey", async () => {
			// Arrange
			const params = { action: "VOD_CREATED", search: "test" };
			const mockLogs = [{ id: "audit_1" }] as never;
			vi.mocked(getAdminAuditLogs).mockResolvedValueOnce(mockLogs);

			// Act
			const options = adminAuditQueryOptions(params);
			const result = await (options.queryFn as () => Promise<unknown>)();

			// Assert
			expect(options.queryKey).toEqual([...queryKeys.audit, params]);
			expect(getAdminAuditLogs).toHaveBeenCalledWith({
				data: { action: "VOD_CREATED", search: "test" },
			});
			expect(result).toBe(mockLogs);
		});

		it("constructs query options with default queryKey when params are empty or omitted", async () => {
			// Arrange
			const mockLogs = [] as never;
			vi.mocked(getAdminAuditLogs).mockResolvedValueOnce(mockLogs);

			// Act
			const optionsWithEmpty = adminAuditQueryOptions({});
			const optionsWithoutParams = adminAuditQueryOptions();
			const result = await (
				optionsWithoutParams.queryFn as () => Promise<unknown>
			)();

			// Assert
			expect(optionsWithEmpty.queryKey).toEqual(queryKeys.audit);
			expect(optionsWithoutParams.queryKey).toEqual(queryKeys.audit);
			expect(getAdminAuditLogs).toHaveBeenCalledWith({
				data: { action: undefined, search: undefined },
			});
			expect(result).toBe(mockLogs);
		});
	});

	describe("loadAdminAudit", () => {
		it("warms query cache using queryClient.query with staleTime static", async () => {
			// Arrange
			const mockQuery = vi.fn().mockResolvedValueOnce(undefined);
			const mockQueryClient = { query: mockQuery } as unknown as QueryClient;
			const deps = { action: "VOD_DELETED", search: "delete" };

			// Act
			await loadAdminAudit({
				context: { queryClient: mockQueryClient },
				deps,
			});

			// Assert
			expect(mockQuery).toHaveBeenCalledWith(
				expect.objectContaining({
					queryKey: [...queryKeys.audit, deps],
					staleTime: "static",
				}),
			);
		});
	});
});
