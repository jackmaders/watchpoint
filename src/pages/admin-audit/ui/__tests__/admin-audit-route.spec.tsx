import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@tanstack/react-router");
vi.mock("../admin-audit-page");

import { getRouteApi } from "@tanstack/react-router";
import { AdminAuditPage } from "../admin-audit-page";
import { AdminAuditRouteComponent } from "../admin-audit-route";

describe("AdminAuditRouteComponent", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(AdminAuditPage).mockReturnValue(
			<div data-testid="mock-admin-audit-page">Admin Audit Page</div>,
		);
	});

	it("renders AdminAuditPage and handles filter navigation", () => {
		// Arrange
		const mockNavigate = vi.fn();
		const mockLogs = [{ id: "audit_1" }];
		const routeApi = getRouteApi("/admin/audit");
		vi.mocked(routeApi.useLoaderData).mockReturnValue({
			logs: mockLogs as never,
		});
		vi.mocked(routeApi.useSearch).mockReturnValue({ action: "VOD_CREATED" });
		vi.mocked(routeApi.useNavigate).mockReturnValue(mockNavigate);

		// Act
		render(<AdminAuditRouteComponent />);

		// Assert
		expect(screen.getByTestId("mock-admin-audit-page")).toBeDefined();
		expect(AdminAuditPage).toHaveBeenCalledWith(
			expect.objectContaining({
				initialLogs: mockLogs,
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
});
