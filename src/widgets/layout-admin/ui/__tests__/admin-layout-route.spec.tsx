import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@tanstack/react-router");
vi.mock("../admin-route-view");

import { getRouteApi } from "@tanstack/react-router";
import { AdminLayoutRouteComponent } from "../admin-layout-route";
import { AdminRouteView } from "../admin-route-view";

describe("AdminLayoutRouteComponent", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(AdminRouteView).mockReturnValue(
			<div data-testid="mock-admin-route-view">Admin Route View</div>,
		);
	});

	it("renders AdminRouteView with context from route api", () => {
		// Arrange
		const mockUser = { id: "usr_1", role: "ADMIN" as const };
		const routeApi = getRouteApi("/admin");
		vi.mocked(routeApi.useRouteContext).mockReturnValue({
			unauthorized: false,
			user: mockUser,
		});

		// Act
		render(<AdminLayoutRouteComponent />);

		// Assert
		expect(screen.getByTestId("mock-admin-route-view")).toBeDefined();
		expect(AdminRouteView).toHaveBeenCalledWith(
			{
				unauthorized: false,
				user: mockUser,
			},
			undefined,
		);
	});
});
