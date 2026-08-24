import { describe, expect, it, vi } from "vitest";

vi.mock("@tanstack/react-router");
vi.mock("@/pages/home");

import { homeRouteOptions } from "@/pages/home";
import { Route } from "../index";

describe("Home index route", () => {
	it("wires homeRouteOptions into createFileRoute", () => {
		// Arrange & Act & Assert
		expect(Route.options).toEqual(homeRouteOptions);
	});
});
