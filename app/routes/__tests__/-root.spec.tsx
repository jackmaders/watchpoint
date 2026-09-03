import { describe, expect, it, vi } from "vitest";

vi.mock("@tanstack/react-router");

import { Route } from "../__root";

describe("Root route", () => {
	it("wires root route options and shell components", () => {
		// Arrange & Act
		const rootOptions = Route.options;

		// Assert
		expect(rootOptions).toBeDefined();
		expect(rootOptions.component).toBeDefined();
		expect(rootOptions.head).toBeDefined();
		expect(rootOptions.notFoundComponent).toBeDefined();
	});
});
