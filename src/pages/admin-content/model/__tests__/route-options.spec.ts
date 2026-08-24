import { describe, expect, it } from "vitest";
import { loadAdminContent } from "../../api/loaders";
import { AdminContentRouteComponent } from "../../ui/admin-content-route";
import { adminContentRouteOptions } from "../route-options";

describe("admin content route options", () => {
	it("wires loadAdminContent and AdminContentRouteComponent", () => {
		// Arrange & Act & Assert
		expect(adminContentRouteOptions.loader).toBe(loadAdminContent);
		expect(adminContentRouteOptions.component).toBe(AdminContentRouteComponent);
	});
});
