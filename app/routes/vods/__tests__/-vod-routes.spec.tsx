import { describe, expect, it, vi } from "vitest";

vi.mock("@tanstack/react-router");
vi.mock("@/pages/vods");
vi.mock("@/pages/vods-id");
vi.mock("@/pages/vods-id-session");

import { vodsRouteOptions } from "@/pages/vods";
import { vodsIdRouteOptions } from "@/pages/vods-id";
import { vodsIdSessionRouteOptions } from "@/pages/vods-id-session";
import { Route as VodDetailRoute } from "../$id";
import { Route as VodSessionRoute } from "../$id.session";
import { Route as VodsIndexRoute } from "../index";

describe("vods routes", () => {
	it("VodsIndexRoute wires vodsRouteOptions", () => {
		// Arrange & Act & Assert
		expect(VodsIndexRoute.options).toEqual(vodsRouteOptions);
	});

	it("VodDetailRoute wires vodsIdRouteOptions", () => {
		// Arrange & Act & Assert
		expect(VodDetailRoute.options).toEqual(vodsIdRouteOptions);
	});

	it("VodSessionRoute wires vodsIdSessionRouteOptions", () => {
		// Arrange & Act & Assert
		expect(VodSessionRoute.options).toEqual(vodsIdSessionRouteOptions);
	});
});
