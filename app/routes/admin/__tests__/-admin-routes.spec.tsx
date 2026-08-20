import { redirect } from "@tanstack/react-router";
import { render, screen } from "@testing-library/react";
import type React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@tanstack/react-router");
vi.mock("@/pages/admin");
vi.mock("@/pages/admin-users");

import { AccessDeniedPage, AdminLayout, checkAdminAccess } from "@/pages/admin";
import { AdminUsersPage, getAdminUsers } from "@/pages/admin-users";
import { Route as AdminRoute, AdminRouteComponent } from "../../admin";
import { Route as AdminIndexRoute } from "../index";
import { Route as AdminUsersRoute, AdminUsersRouteComponent } from "../users";

describe("admin routes", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(AccessDeniedPage).mockReturnValue(
			<div data-testid="mock-access-denied">Access Denied</div>,
		);
		vi.mocked(AdminLayout).mockImplementation(({ children }) => (
			<div data-testid="mock-admin-layout">{children}</div>
		));
		vi.mocked(AdminUsersPage).mockReturnValue(
			<div data-testid="mock-admin-users-page">Admin Users Page</div>,
		);
	});

	describe("AdminRoute (/admin)", () => {
		it("beforeLoad succeeds and returns user context for administrator", async () => {
			// Arrange
			const mockAdmin = {
				email: "admin@example.com",
				id: "usr_admin",
				name: "Admin User",
				role: "ADMIN" as const,
			};
			vi.mocked(checkAdminAccess).mockResolvedValueOnce(mockAdmin);
			const beforeLoad = AdminRoute.options
				.beforeLoad as () => Promise<unknown>;

			// Act
			const context = await beforeLoad();

			// Assert
			expect(checkAdminAccess).toHaveBeenCalled();
			expect(context).toEqual({ unauthorized: false, user: mockAdmin });
		});

		it("beforeLoad flags unauthorized when user gets 403 Forbidden", async () => {
			// Arrange
			vi.mocked(checkAdminAccess).mockRejectedValueOnce(
				new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 }),
			);
			const beforeLoad = AdminRoute.options
				.beforeLoad as () => Promise<unknown>;

			// Act
			const context = await beforeLoad();

			// Assert
			expect(context).toEqual({ unauthorized: true, user: null });
		});

		it("beforeLoad redirects to / when user gets 401 Unauthorized", async () => {
			// Arrange
			vi.mocked(checkAdminAccess).mockRejectedValueOnce(
				new Response(JSON.stringify({ error: "Unauthorized" }), {
					status: 401,
				}),
			);
			const beforeLoad = AdminRoute.options
				.beforeLoad as () => Promise<unknown>;

			// Act & Assert
			await expect(beforeLoad()).rejects.toEqual(redirect({ to: "/" }));
		});

		it("beforeLoad redirects to / when checkAdminAccess throws generic error", async () => {
			// Arrange
			vi.mocked(checkAdminAccess).mockRejectedValueOnce(
				new Error("Session expired"),
			);
			const beforeLoad = AdminRoute.options
				.beforeLoad as () => Promise<unknown>;

			// Act & Assert
			await expect(beforeLoad()).rejects.toEqual(redirect({ to: "/" }));
		});

		it("renders AccessDeniedPage when unauthorized context is present", () => {
			// Arrange
			vi.mocked(AdminRoute.useRouteContext).mockReturnValue({
				unauthorized: true,
				user: null,
			});

			// Act
			render(<AdminRouteComponent />);

			// Assert
			expect(screen.getByTestId("mock-access-denied")).toBeDefined();
		});

		it("renders AdminLayout when authorized context is present", () => {
			// Arrange
			vi.mocked(AdminRoute.useRouteContext).mockReturnValue({
				unauthorized: false,
				user: {
					email: "admin@example.com",
					id: "usr_admin",
					name: "Admin User",
					role: "ADMIN" as const,
				},
			});

			// Act
			render(<AdminRouteComponent />);

			// Assert
			expect(screen.getByTestId("mock-admin-layout")).toBeDefined();
		});
	});

	describe("AdminIndexRoute (/admin/)", () => {
		it("beforeLoad redirects to /admin/users", () => {
			// Arrange
			const beforeLoad = AdminIndexRoute.options.beforeLoad as () => unknown;

			// Act & Assert
			expect(() => beforeLoad()).toThrow();
		});

		it("renders null component", () => {
			// Arrange
			const Component = AdminIndexRoute.options
				.component as () => React.ReactNode;

			// Act & Assert
			expect(Component()).toBeNull();
		});
	});

	describe("AdminUsersRoute (/admin/users)", () => {
		it("loader fetches admin users list", async () => {
			// Arrange
			const mockUsers = [
				{
					createdAt: new Date(),
					email: "admin@example.com",
					id: "usr_admin",
					name: "Admin",
					role: "ADMIN" as const,
				},
			];
			vi.mocked(getAdminUsers).mockResolvedValueOnce(mockUsers as never);
			const loader = AdminUsersRoute.options.loader as () => Promise<unknown>;

			// Act
			const data = await loader();

			// Assert
			expect(getAdminUsers).toHaveBeenCalledWith({ data: {} });
			expect(data).toEqual({ users: mockUsers });
		});

		it("renders AdminUsersPage with loader data and user context", () => {
			// Arrange
			const mockAdmin = {
				email: "admin@example.com",
				id: "usr_admin",
				name: "Admin",
				role: "ADMIN" as const,
			};
			const mockUsers = [
				{
					createdAt: new Date(),
					email: "player@example.com",
					id: "usr_player",
					name: "Player",
					role: "PLAYER" as const,
				},
			];
			vi.mocked(AdminUsersRoute.useRouteContext).mockReturnValue({
				user: mockAdmin,
			});
			vi.mocked(AdminUsersRoute.useLoaderData).mockReturnValue({
				users: mockUsers,
			});

			// Act
			render(<AdminUsersRouteComponent />);

			// Assert
			expect(screen.getByTestId("mock-admin-users-page")).toBeDefined();
			expect(AdminUsersPage).toHaveBeenCalledWith(
				{ currentUser: mockAdmin, initialUsers: mockUsers },
				undefined,
			);
		});
	});
});
