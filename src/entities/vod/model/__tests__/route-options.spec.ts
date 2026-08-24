import { describe, expect, it } from "vitest";
import { handleVodManifestRequest } from "../../api/manifest";
import { vodManifestApiRouteOptions } from "../route-options";

describe("vod manifest api route options", () => {
	it("wires handleVodManifestRequest to GET handler", () => {
		// Arrange & Act & Assert
		expect(vodManifestApiRouteOptions.server.handlers.GET).toBe(
			handleVodManifestRequest,
		);
	});
});
