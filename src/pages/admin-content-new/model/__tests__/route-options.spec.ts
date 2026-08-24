import { describe, expect, it } from "vitest";
import { AdminContentNewRouteComponent } from "../../ui/admin-content-new-route";
import { adminContentNewRouteOptions } from "../route-options";

describe("admin-content-new route options", () => {
	it("wires AdminContentNewRouteComponent", () => {
		// Arrange & Act & Assert
		expect(adminContentNewRouteOptions.component).toBe(
			AdminContentNewRouteComponent,
		);
	});
});
