import { describe, expect, it } from "vitest";
import { loadHistoryIdPage } from "../../api/loaders";
import { HistoryIdRouteComponent } from "../../ui/history-id-route";
import { historyIdRouteOptions } from "../route-options";

describe("history-id route options", () => {
	it("wires loadHistoryIdPage and HistoryIdRouteComponent", () => {
		// Arrange & Act & Assert
		expect(historyIdRouteOptions.loader).toBe(loadHistoryIdPage);
		expect(historyIdRouteOptions.component).toBe(HistoryIdRouteComponent);
	});
});
