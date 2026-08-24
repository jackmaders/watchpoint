import { describe, expect, it, vi } from "vitest";

vi.mock("@tanstack/react-router");
vi.mock("@/pages/history");
vi.mock("@/pages/history-id");

import { historyRouteOptions } from "@/pages/history";
import { historyIdRouteOptions } from "@/pages/history-id";
import { Route as HistoryIdRoute } from "../$id";
import { Route as HistoryIndexRoute } from "../index";

describe("history routes", () => {
	it("HistoryIndexRoute wires historyRouteOptions", () => {
		// Arrange & Act & Assert
		expect(HistoryIndexRoute.options).toEqual(historyRouteOptions);
	});

	it("HistoryIdRoute wires historyIdRouteOptions", () => {
		// Arrange & Act & Assert
		expect(HistoryIdRoute.options).toEqual(historyIdRouteOptions);
	});
});
