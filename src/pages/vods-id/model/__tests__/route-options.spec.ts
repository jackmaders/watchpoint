import { describe, expect, it } from "vitest";
import { loadVodsIdPage } from "../../api/loaders";
import { VodsIdRouteComponent } from "../../ui/vods-id-route";
import { vodsIdRouteOptions } from "../route-options";

describe("vods-id route options", () => {
	it("wires loadVodsIdPage and VodsIdRouteComponent", () => {
		// Arrange & Act & Assert
		expect(vodsIdRouteOptions.loader).toBe(loadVodsIdPage);
		expect(vodsIdRouteOptions.component).toBe(VodsIdRouteComponent);
	});
});
