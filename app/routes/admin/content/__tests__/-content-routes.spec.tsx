import { redirect } from "@tanstack/react-router";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@tanstack/react-router");
vi.mock("@/pages/admin-audit");
vi.mock("@/pages/admin-content");

import { getAdminAuditLogs } from "@/pages/admin-audit";
import { AdminVodEditorPage, getAdminVodById } from "@/pages/admin-content";
import {
	AdminVodEditorRouteComponent,
	Route as VodEditorRoute,
} from "../$vodId";
import { AdminNewVodRouteComponent, Route as NewVodRoute } from "../new";

describe("admin content authoring routes", () => {
	const mockAdmin = {
		email: "admin@example.com",
		id: "usr_admin",
		name: "Admin User",
		role: "ADMIN" as const,
	};

	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(AdminVodEditorPage).mockReturnValue(
			<div data-testid="mock-vod-editor-page">VOD Editor Page</div>,
		);
	});

	describe("NewVodRoute (/admin/content/new)", () => {
		it("renders AdminVodEditorPage in create mode with user context", () => {
			// Arrange
			vi.mocked(NewVodRoute.useRouteContext).mockReturnValue({
				user: mockAdmin,
			});

			// Act
			render(<AdminNewVodRouteComponent />);

			// Assert
			expect(screen.getByTestId("mock-vod-editor-page")).toBeDefined();
			expect(AdminVodEditorPage).toHaveBeenCalledWith(
				{
					currentUser: mockAdmin,
					initialScenarios: [],
					initialVod: null,
					isCreate: true,
				},
				undefined,
			);
		});

		it("renders null when user context is missing", () => {
			// Arrange
			vi.mocked(NewVodRoute.useRouteContext).mockReturnValue({
				user: null,
			});

			// Act & Assert
			expect(AdminNewVodRouteComponent()).toBeNull();
		});
	});

	describe("VodEditorRoute (/admin/content/$vodId)", () => {
		it("loader fetches VOD by id and audit logs", async () => {
			// Arrange
			const mockVod = {
				id: "v1",
				scenarios: [{ id: "s1" }],
				title: "Test VOD",
			};
			const mockAudits = [{ action: "VOD_CREATED", id: "a1" }];
			vi.mocked(getAdminVodById).mockResolvedValueOnce(mockVod as never);
			vi.mocked(getAdminAuditLogs).mockResolvedValueOnce(mockAudits as never);
			const loader = VodEditorRoute.options.loader as (ctx: {
				params: { vodId: string };
			}) => Promise<unknown>;

			// Act
			const data = await loader({ params: { vodId: "v1" } });

			// Assert
			expect(getAdminVodById).toHaveBeenCalledWith({ data: { id: "v1" } });
			expect(getAdminAuditLogs).toHaveBeenCalledWith({
				data: { entityId: "v1" },
			});
			expect(data).toEqual({
				auditEntries: mockAudits,
				scenarios: mockVod.scenarios,
				vod: mockVod,
			});
		});

		it("loader redirects to /admin/content when VOD is not found", async () => {
			// Arrange
			vi.mocked(getAdminVodById).mockResolvedValueOnce(null);
			const loader = VodEditorRoute.options.loader as (ctx: {
				params: { vodId: string };
			}) => Promise<unknown>;

			// Act & Assert
			await expect(loader({ params: { vodId: "v_missing" } })).rejects.toEqual(
				redirect({ to: "/admin/content" }),
			);
		});

		it("renders AdminVodEditorPage with loaded VOD, scenarios, and audits", () => {
			// Arrange
			const mockVod = {
				id: "v1",
				scenarios: [{ id: "s1" }],
				title: "Test VOD",
			};
			const mockAudits = [{ action: "VOD_CREATED", id: "a1" }];
			vi.mocked(VodEditorRoute.useRouteContext).mockReturnValue({
				user: mockAdmin,
			});
			vi.mocked(VodEditorRoute.useLoaderData).mockReturnValue({
				auditEntries: mockAudits,
				scenarios: mockVod.scenarios,
				vod: mockVod,
			});

			// Act
			render(<AdminVodEditorRouteComponent />);

			// Assert
			expect(screen.getByTestId("mock-vod-editor-page")).toBeDefined();
			expect(AdminVodEditorPage).toHaveBeenCalledWith(
				{
					auditEntries: mockAudits,
					currentUser: mockAdmin,
					initialScenarios: mockVod.scenarios,
					initialVod: mockVod,
					isCreate: false,
				},
				undefined,
			);
		});

		it("renders null when user context is missing", () => {
			// Arrange
			vi.mocked(VodEditorRoute.useRouteContext).mockReturnValue({
				user: null,
			});
			vi.mocked(VodEditorRoute.useLoaderData).mockReturnValue({
				auditEntries: [],
				scenarios: [],
				vod: { id: "v1" },
			});

			// Act & Assert
			expect(AdminVodEditorRouteComponent()).toBeNull();
		});
	});
});
