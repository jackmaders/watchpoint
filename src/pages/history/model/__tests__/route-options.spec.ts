import { describe, expect, it } from "vitest";
import { loadHistoryIndexPage } from "../../api/loaders";
import { HistoryRouteComponent } from "../../ui/history-route";
import { historyRouteOptions } from "../route-options";
import { historySearchSchema } from "../search-params";

describe("history route options", () => {
	it("wires loadHistoryIndexPage, historySearchSchema, and component", () => {
		// Arrange & Act & Assert
		expect(historyRouteOptions.loader).toBe(loadHistoryIndexPage);
		expect(historyRouteOptions.component).toBe(HistoryRouteComponent);
		expect(historyRouteOptions.validateSearch).toBe(historySearchSchema);

		const search = { page: 1 };
		expect(historyRouteOptions.loaderDeps({ search })).toBe(search);
	});
});
