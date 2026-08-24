import { describe, expect, it } from "vitest";
import { loadHomePage } from "../../api/loaders";
import { HomeRouteComponent } from "../../ui/home-route";
import { homeRouteOptions } from "../route-options";

describe("homeRouteOptions", () => {
	it("wires loadHomePage and HomeRouteComponent", () => {
		// Arrange & Act & Assert
		expect(homeRouteOptions.loader).toBe(loadHomePage);
		expect(homeRouteOptions.component).toBe(HomeRouteComponent);
	});
});
