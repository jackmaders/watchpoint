import { redirect } from "@tanstack/react-router";
import { render, screen } from "@testing-library/react";
import type React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@tanstack/react-router");
vi.mock("@/pages/admin");
vi.mock("@/pages/admin-content");
vi.mock("@/pages/admin-users");
vi.mock("@/pages/admin-audit");

import { AccessDeniedPage, AdminLayout, checkAdminAccess } from "@/pages/admin";
import {
	AdminAuditPage,
	getAdminAuditLogs,
	toGetAdminAuditLogsQuery,
} from "@/pages/admin-audit";
import {
	AdminContentPage,
	type ContentSearchParams,
	getAdminVods,
	toGetAdminVodsQuery,
} from "@/pages/admin-content";
import { AdminUsersPage, getAdminUsers } from "@/pages/admin-users";
import { Route as AdminRoute, AdminRouteComponent } from "../../admin";
import { Route as AdminAuditRoute, AdminAuditRouteComponent } from "../audit";
import {
	Route as AdminContentRoute,
	AdminContentRouteComponent,
} from "../content";
import { Route as AdminIndexRoute } from "../index";
import { Route as AdminUsersRoute, AdminUsersRouteComponent } from "../users";

function mockToGetAdminVodsQuery(deps: ContentSearchParams) {
	const isPublished =
		deps.status === "PUBLISHED"
			? true
			: deps.status === "DRAFT"
				? false
				: undefined;
	const role = deps.role === "ALL" ? undefined : deps.role;
	return { isPublished, role, search: deps.search };
}

describe("admin routes", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(toGetAdminVodsQuery).mockImplementation(mockToGetAdminVodsQuery);
		vi.mocked(toGetAdminAuditLogsQuery).mockImplementation((deps) => ({
			action: deps.action && deps.action !== "ALL" ? deps.action : undefined,
			search: deps.search,
		}));
		vi.mocked(AccessDeniedPage).mockReturnValue(
			<div data-testid="mock-access-denied">Access Denied</div>,
		);
		vi.mocked(AdminLayout).mockImplementation(({ children }) => (
			<div data-testid="mock-admin-layout">{children}</div>
		));
		vi.mocked(AdminUsersPage).mockReturnValue(
			<div data-testid="mock-admin-users-page">Admin Users Page</div>,
		);
		vi.mocked(AdminContentPage).mockReturnValue(
			<div data-testid="mock-admin-content-page">Admin Content Page</div>,
		);
		vi.mocked(AdminAuditPage).mockReturnValue(
			<div data-testid="mock-admin-audit-page">Admin Audit Page</div>,
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
		it("beforeLoad redirects to /admin/content", () => {
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

		it("renders null when user is not present in context", () => {
			// Arrange
			vi.mocked(AdminUsersRoute.useRouteContext).mockReturnValue({
				user: null,
			});
			vi.mocked(AdminUsersRoute.useLoaderData).mockReturnValue({
				users: [],
			});

			// Act
			const { container } = render(<AdminUsersRouteComponent />);

			// Assert
			expect(container.firstChild).toBeNull();
		});
	});

	describe("AdminContentRoute (/admin/content)", () => {
		it("loader fetches admin vods with search dependencies", async () => {
			// Arrange
			const mockVods = [
				{
					createdAt: new Date(),
					durationSeconds: 600,
					heroName: "Reinhardt",
					id: "vod_1",
					isPublished: true,
					mapName: "King's Row",
					rankTier: "GM",
					role: "TANK" as const,
					scenarios: [],
					title: "GM Rein",
					youtubeVideoId: "yt_rein",
				},
			];
			vi.mocked(getAdminVods).mockResolvedValueOnce(mockVods as never);
			const loader = AdminContentRoute.options.loader as (ctx: {
				deps: ContentSearchParams;
			}) => Promise<unknown>;

			// Act
			const data = await loader({
				deps: {
					role: "TANK",
					search: "rein",
					status: "PUBLISHED",
				},
			});

			// Assert
			expect(getAdminVods).toHaveBeenCalledWith({
				data: {
					isPublished: true,
					role: "TANK",
					search: "rein",
				},
			});
			expect(data).toEqual({ vods: mockVods });
		});

		it("loader handles draft status and all role", async () => {
			// Arrange
			vi.mocked(getAdminVods).mockResolvedValueOnce([] as never);
			const loader = AdminContentRoute.options.loader as (ctx: {
				deps: ContentSearchParams;
			}) => Promise<unknown>;

			// Act
			const data = await loader({
				deps: {
					role: "ALL",
					status: "DRAFT",
				},
			});

			// Assert
			expect(getAdminVods).toHaveBeenCalledWith({
				data: {
					isPublished: false,
					role: undefined,
					search: undefined,
				},
			});
			expect(data).toEqual({ vods: [] });
		});

		it("loader handles all status", async () => {
			// Arrange
			vi.mocked(getAdminVods).mockResolvedValueOnce([] as never);
			const loader = AdminContentRoute.options.loader as (ctx: {
				deps: ContentSearchParams;
			}) => Promise<unknown>;

			// Act
			const data = await loader({
				deps: {
					status: "ALL",
				},
			});

			// Assert
			expect(getAdminVods).toHaveBeenCalledWith({
				data: {
					isPublished: undefined,
					role: undefined,
					search: undefined,
				},
			});
			expect(data).toEqual({ vods: [] });
		});

		it("renders AdminContentPage with loader data, context, and filter callbacks", () => {
			// Arrange
			const mockAdmin = {
				email: "admin@example.com",
				id: "usr_admin",
				name: "Admin",
				role: "ADMIN" as const,
			};
			const mockNavigate = vi.fn();
			vi.mocked(AdminContentRoute.useRouteContext).mockReturnValue({
				user: mockAdmin,
			});
			vi.mocked(AdminContentRoute.useLoaderData).mockReturnValue({
				vods: [],
			});
			vi.mocked(AdminContentRoute.useSearch).mockReturnValue({
				search: "test",
			});
			vi.mocked(AdminContentRoute.useNavigate).mockReturnValue(mockNavigate);

			// Act
			render(<AdminContentRouteComponent />);

			// Assert
			expect(screen.getByTestId("mock-admin-content-page")).toBeDefined();
			expect(AdminContentPage).toHaveBeenCalledWith(
				expect.objectContaining({
					currentUser: mockAdmin,
					initialVods: [],
					searchParams: { search: "test" },
				}),
				undefined,
			);

			// Act: trigger onFilterChange
			const lastCallProps = vi.mocked(AdminContentPage).mock.calls[0]?.[0];
			lastCallProps?.onFilterChange?.({ role: "TANK" });

			// Assert
			expect(mockNavigate).toHaveBeenCalled();
			const navigateArg = mockNavigate.mock.calls[0]?.[0];
			if (typeof navigateArg?.search === "function") {
				const merged = navigateArg.search({ previous: true });
				expect(merged).toEqual({ previous: true, role: "TANK" });
			}
		});

		it("renders null when user is null in route context", () => {
			// Arrange
			vi.mocked(AdminContentRoute.useRouteContext).mockReturnValue({
				user: null,
			});
			vi.mocked(AdminContentRoute.useLoaderData).mockReturnValue({
				vods: [],
			});
			vi.mocked(AdminContentRoute.useSearch).mockReturnValue({});

			// Act
			const { container } = render(<AdminContentRouteComponent />);

			// Assert
			expect(container.firstChild).toBeNull();
		});
	});

	describe("AdminAuditRoute (/admin/audit)", () => {
		it("loader fetches admin audit logs with search dependencies", async () => {
			// Arrange
			const mockLogs = [
				{
					action: "VOD_CREATED",
					actorUserId: "admin_1",
					createdAt: new Date(),
					entityId: "vod_1",
					entityType: "VOD",
					id: "audit_1",
					metadata: {},
				},
			];
			vi.mocked(getAdminAuditLogs).mockResolvedValueOnce(mockLogs as never);
			const loader = AdminAuditRoute.options.loader as (ctx: {
				deps: { action?: string; search?: string };
			}) => Promise<unknown>;

			// Act
			const data = await loader({
				deps: {
					action: "VOD_CREATED",
					search: "admin",
				},
			});

			// Assert
			expect(getAdminAuditLogs).toHaveBeenCalledWith({
				data: {
					action: "VOD_CREATED",
					search: "admin",
				},
			});
			expect(data).toEqual({ logs: mockLogs });
		});

		it("renders AdminAuditPage with loader data, user context, and filter callbacks", () => {
			// Arrange
			const mockAdmin = {
				email: "admin@example.com",
				id: "usr_admin",
				name: "Admin",
				role: "ADMIN" as const,
			};
			const mockLogs = [
				{
					action: "VOD_CREATED",
					actorUserId: "admin_1",
					createdAt: new Date(),
					entityId: "vod_1",
					entityType: "VOD",
					id: "audit_1",
					metadata: {},
				},
			];
			const mockNavigate = vi.fn();
			vi.mocked(AdminAuditRoute.useRouteContext).mockReturnValue({
				user: mockAdmin,
			});
			vi.mocked(AdminAuditRoute.useLoaderData).mockReturnValue({
				logs: mockLogs,
			});
			vi.mocked(AdminAuditRoute.useSearch).mockReturnValue({
				action: "VOD_CREATED",
			});
			vi.mocked(AdminAuditRoute.useNavigate).mockReturnValue(mockNavigate);

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
			const navigateArg = mockNavigate.mock.calls[0]?.[0];
			if (typeof navigateArg?.search === "function") {
				const merged = navigateArg.search({ previous: true });
				expect(merged).toEqual({ action: "VOD_DELETED", previous: true });
			}
		});

		it("renders null when user is not present in context", () => {
			// Arrange
			vi.mocked(AdminAuditRoute.useRouteContext).mockReturnValue({
				user: null,
			});
			vi.mocked(AdminAuditRoute.useLoaderData).mockReturnValue({
				logs: [],
			});
			vi.mocked(AdminAuditRoute.useSearch).mockReturnValue({});

			// Act
			const { container } = render(<AdminAuditRouteComponent />);

			// Assert
			expect(container.firstChild).toBeNull();
		});
	});
});
