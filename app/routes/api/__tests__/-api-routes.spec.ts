import { describe, expect, it, vi } from "vitest";

vi.mock("@tanstack/react-router");
vi.mock("@/shared/lib/auth");
vi.mock("@/shared/media");
vi.mock("@/entities/vod");

import { vodManifestApiRouteOptions } from "@/entities/vod";
import { authApiRouteOptions } from "@/shared/lib/auth";
import { mediaApiRouteOptions } from "@/shared/media";
import { Route as AuthApiRoute } from "../auth/$";
import { Route as MediaApiRoute } from "../media/$";
import { Route as VodManifestApiRoute } from "../vods/$id/manifest";

describe("API route adapters", () => {
	it("AuthApiRoute wires authApiRouteOptions", () => {
		// Arrange & Act & Assert
		expect(AuthApiRoute.options).toEqual(authApiRouteOptions);
	});

	it("MediaApiRoute wires mediaApiRouteOptions", () => {
		// Arrange & Act & Assert
		expect(MediaApiRoute.options).toEqual(mediaApiRouteOptions);
	});

	it("VodManifestApiRoute wires vodManifestApiRouteOptions", () => {
		// Arrange & Act & Assert
		expect(VodManifestApiRoute.options).toEqual(vodManifestApiRouteOptions);
	});
});
