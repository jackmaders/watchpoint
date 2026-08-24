import { describe, expect, it } from "vitest";
import { loadVodsPage } from "../../api/loaders";
import { VodsRouteComponent } from "../../ui/vods-route";
import { vodsRouteOptions } from "../route-options";

describe("vodsRouteOptions", () => {
	it("wires loadVodsPage and VodsRouteComponent", () => {
		// Arrange & Act & Assert
		expect(vodsRouteOptions.loader).toBe(loadVodsPage);
		expect(vodsRouteOptions.component).toBe(VodsRouteComponent);
	});
});
