import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@tanstack/react-router");
vi.mock("@tanstack/react-query");
vi.mock("../admin-audit-page");

import { useSuspenseQuery } from "@tanstack/react-query";
import { getRouteApi } from "@tanstack/react-router";
import { adminAuditQueryOptions } from "../../api/loaders";
import { AdminAuditPage } from "../admin-audit-page";
import { AdminAuditRouteComponent } from "../admin-audit-route";

describe("AdminAuditRouteComponent", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(AdminAuditPage).mockReturnValue(
			<div data-testid="mock-admin-audit-page">Admin Audit Page</div>,
		);
	});

	it("renders AdminAuditPage with suspense query data and handles filter navigation", () => {
		// Arrange
		const mockNavigate = vi.fn();
		const mockLogs = [{ id: "audit_1" }];
		const searchParams = { action: "VOD_CREATED" };
		const routeApi = getRouteApi("/admin/audit");
		vi.mocked(routeApi.useSearch).mockReturnValue(searchParams);
		vi.mocked(routeApi.useNavigate).mockReturnValue(mockNavigate);
		vi.mocked(useSuspenseQuery).mockReturnValue({
			data: mockLogs,
		} as never);

		// Act
		render(<AdminAuditRouteComponent />);

		// Assert
		expect(useSuspenseQuery).toHaveBeenCalledWith(
			adminAuditQueryOptions(searchParams),
		);
		expect(screen.getByTestId("mock-admin-audit-page")).toBeDefined();
		expect(AdminAuditPage).toHaveBeenCalledWith(
			expect.objectContaining({
				logs: mockLogs,
				searchParams: { action: "VOD_CREATED" },
			}),
			undefined,
		);

		// Act: trigger onFilterChange
		const lastCallProps = vi.mocked(AdminAuditPage).mock.calls[0]?.[0];
		lastCallProps?.onFilterChange?.({ action: "VOD_DELETED" });

		// Assert
		expect(mockNavigate).toHaveBeenCalled();
		const navArg = mockNavigate.mock.calls[0]?.[0];
		if (typeof navArg?.search === "function") {
			const res = navArg.search({ old: true });
			expect(res).toEqual({ action: "VOD_DELETED", old: true });
		}
	});

	it("falls back to empty array when query data is undefined", () => {
		// Arrange
		const routeApi = getRouteApi("/admin/audit");
		vi.mocked(routeApi.useSearch).mockReturnValue({});
		vi.mocked(routeApi.useNavigate).mockReturnValue(vi.fn());
		vi.mocked(useSuspenseQuery).mockReturnValue({
			data: undefined,
		} as never);

		// Act
		render(<AdminAuditRouteComponent />);

		// Assert
		expect(AdminAuditPage).toHaveBeenCalledWith(
			expect.objectContaining({
				logs: [],
			}),
			undefined,
		);
	});
});
