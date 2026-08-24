import { describe, expect, it } from "vitest";
import { adminBeforeLoad } from "../../api/admin-guard";
import { AdminLayoutRouteComponent } from "../../ui/admin-layout-route";
import { adminRouteOptions } from "../route-options";

describe("admin layout route options", () => {
	it("wires adminBeforeLoad and AdminLayoutRouteComponent", () => {
		// Arrange & Act & Assert
		expect(adminRouteOptions.beforeLoad).toBe(adminBeforeLoad);
		expect(adminRouteOptions.component).toBe(AdminLayoutRouteComponent);
	});
});
