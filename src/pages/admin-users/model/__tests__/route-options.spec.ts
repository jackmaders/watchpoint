import { describe, expect, it } from "vitest";
import { loadAdminUsers } from "../../api/loaders";
import { AdminUsersRouteComponent } from "../../ui/admin-users-route";
import { adminUsersRouteOptions } from "../route-options";

describe("admin-users route options", () => {
	it("wires adminUsersRouteOptions correctly", () => {
		// Arrange & Act & Assert
		expect(adminUsersRouteOptions.loader).toBe(loadAdminUsers);
		expect(adminUsersRouteOptions.component).toBe(AdminUsersRouteComponent);
	});
});
