import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@tanstack/react-router");
vi.mock("../admin-users-page");

import { getRouteApi } from "@tanstack/react-router";
import { AdminUsersPage } from "../admin-users-page";
import { AdminUsersRouteComponent } from "../admin-users-route";

describe("AdminUsersRouteComponent", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(AdminUsersPage).mockReturnValue(
			<div data-testid="mock-admin-users-page">Admin Users Page</div>,
		);
	});

	it("renders null when user is missing from context", () => {
		// Arrange
		const routeApi = getRouteApi("/admin/users");
		vi.mocked(routeApi.useRouteContext).mockReturnValue({ user: null });
		vi.mocked(routeApi.useLoaderData).mockReturnValue({ users: [] });

		// Act
		const { container } = render(<AdminUsersRouteComponent />);

		// Assert
		expect(container.firstChild).toBeNull();
	});

	it("renders AdminUsersPage with loader data from route api", () => {
		// Arrange
		const mockUser = {
			createdAt: new Date(),
			email: "admin@example.com",
			id: "usr_1",
			name: "Admin",
			role: "ADMIN" as const,
		};
		const mockUsers = [
			{
				createdAt: new Date(),
				email: "player@example.com",
				emailVerified: true,
				id: "usr_2",
				image: null,
				isTestAccount: false,
				name: "Player",
				role: "PLAYER" as const,
				updatedAt: new Date(),
			},
		];
		const routeApi = getRouteApi("/admin/users");
		vi.mocked(routeApi.useRouteContext).mockReturnValue({ user: mockUser });
		vi.mocked(routeApi.useLoaderData).mockReturnValue({ users: mockUsers });

		// Act
		render(<AdminUsersRouteComponent />);

		// Assert
		expect(screen.getByTestId("mock-admin-users-page")).toBeDefined();
		expect(AdminUsersPage).toHaveBeenCalledWith(
			{
				currentUser: mockUser,
				initialUsers: mockUsers,
			},
			undefined,
		);
	});
});
