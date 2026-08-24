import { describe, expect, it, vi } from "vitest";

vi.mock("@tanstack/react-router");
vi.mock("@/widgets/layout-admin");
vi.mock("@/pages/admin");
vi.mock("@/pages/admin-content");
vi.mock("@/pages/admin-users");
vi.mock("@/pages/admin-audit");

import { adminIndexRouteOptions } from "@/pages/admin";
import { adminAuditRouteOptions } from "@/pages/admin-audit";
import { adminContentRouteOptions } from "@/pages/admin-content";
import { adminUsersRouteOptions } from "@/pages/admin-users";
import { adminRouteOptions } from "@/widgets/layout-admin";
import { Route as AdminRoute } from "../../admin";
import { Route as AdminAuditRoute } from "../audit";
import { Route as AdminContentRoute } from "../content";
import { Route as AdminIndexRoute } from "../index";
import { Route as AdminUsersRoute } from "../users";

describe("admin routes", () => {
	it("AdminRoute wires adminRouteOptions from widgets/layout-admin", () => {
		// Arrange & Act & Assert
		expect(AdminRoute.options).toEqual(adminRouteOptions);
	});

	it("AdminIndexRoute wires adminIndexRouteOptions from pages/admin", () => {
		// Arrange & Act & Assert
		expect(AdminIndexRoute.options).toEqual(adminIndexRouteOptions);
	});

	it("AdminUsersRoute wires adminUsersRouteOptions", () => {
		// Arrange & Act & Assert
		expect(AdminUsersRoute.options).toEqual(adminUsersRouteOptions);
	});

	it("AdminContentRoute wires adminContentRouteOptions", () => {
		// Arrange & Act & Assert
		expect(AdminContentRoute.options).toEqual(adminContentRouteOptions);
	});

	it("AdminAuditRoute wires adminAuditRouteOptions", () => {
		// Arrange & Act & Assert
		expect(AdminAuditRoute.options).toEqual(adminAuditRouteOptions);
	});
});
