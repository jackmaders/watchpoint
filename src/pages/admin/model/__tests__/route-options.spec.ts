import { describe, expect, it } from "vitest";
import { adminIndexRouteOptions } from "../route-options";

describe("adminIndexRouteOptions", () => {
	it("exports beforeLoad and component", () => {
		expect(adminIndexRouteOptions.beforeLoad).toBeDefined();
		expect(adminIndexRouteOptions.component).toBeDefined();
		expect(adminIndexRouteOptions.component()).toBeNull();
	});
});
