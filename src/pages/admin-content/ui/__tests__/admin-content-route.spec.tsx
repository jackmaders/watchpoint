import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@tanstack/react-router");
vi.mock("../admin-content-page");

import { getRouteApi } from "@tanstack/react-router";
import { AdminContentPage } from "../admin-content-page";
import { AdminContentRouteComponent } from "../admin-content-route";

describe("AdminContentRouteComponent", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(AdminContentPage).mockReturnValue(
			<div data-testid="mock-admin-content-page">Admin Content Page</div>,
		);
	});

	it("renders null when user context is missing", () => {
		// Arrange
		const routeApi = getRouteApi("/admin/content");
		vi.mocked(routeApi.useRouteContext).mockReturnValue({ user: null });
		vi.mocked(routeApi.useLoaderData).mockReturnValue({ vods: [] });

		// Act
		const { container } = render(<AdminContentRouteComponent />);

		// Assert
		expect(container.firstChild).toBeNull();
	});

	it("renders AdminContentPage with vods and user context from route api", () => {
		// Arrange
		const mockUser = { id: "usr_admin", role: "ADMIN" as const };
		const mockVods = [{ id: "vod_1" }];
		const routeApi = getRouteApi("/admin/content");
		vi.mocked(routeApi.useRouteContext).mockReturnValue({ user: mockUser });
		vi.mocked(routeApi.useLoaderData).mockReturnValue({ vods: mockVods });

		// Act
		render(<AdminContentRouteComponent />);

		// Assert
		expect(screen.getByTestId("mock-admin-content-page")).toBeDefined();
		expect(AdminContentPage).toHaveBeenCalledWith(
			{ currentUser: mockUser, initialVods: mockVods },
			undefined,
		);
	});
});
