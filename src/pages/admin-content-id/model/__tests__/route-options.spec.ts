import { describe, expect, it } from "vitest";
import { loadAdminContentIdPage } from "../../api/loaders";
import { AdminContentIdRouteComponent } from "../../ui/admin-content-id-route";
import { adminContentIdRouteOptions } from "../route-options";

describe("admin-content-id route options", () => {
	it("wires loadAdminContentIdPage and AdminContentIdRouteComponent", () => {
		// Arrange & Act & Assert
		expect(adminContentIdRouteOptions.loader).toBe(loadAdminContentIdPage);
		expect(adminContentIdRouteOptions.component).toBe(
			AdminContentIdRouteComponent,
		);
	});
});
