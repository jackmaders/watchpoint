import { describe, expect, it, vi } from "vitest";

vi.mock("@tanstack/react-router");
vi.mock("@/pages/admin-content-new");
vi.mock("@/pages/admin-content-id");

import { adminContentIdRouteOptions } from "@/pages/admin-content-id";
import { adminContentNewRouteOptions } from "@/pages/admin-content-new";
import { Route as VodEditorRoute } from "../$id";
import { Route as NewVodRoute } from "../new";

describe("admin content authoring routes", () => {
	it("NewVodRoute wires adminContentNewRouteOptions", () => {
		// Arrange & Act & Assert
		expect(NewVodRoute.options).toEqual(adminContentNewRouteOptions);
	});

	it("VodEditorRoute wires adminContentIdRouteOptions", () => {
		// Arrange & Act & Assert
		expect(VodEditorRoute.options).toEqual(adminContentIdRouteOptions);
	});
});
