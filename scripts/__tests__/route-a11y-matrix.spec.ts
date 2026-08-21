import { describe, expect, it } from "vitest";
import {
	getAuditableRoutes,
	getRouteStateConfigurations,
	ROUTE_A11Y_MATRIX,
	resolveRoutePath,
} from "../route-a11y-matrix";

describe("route-a11y-matrix", () => {
	it("defines entries for all public, learner, and administrator routes", () => {
		// Arrange
		const routes = getAuditableRoutes();

		// Act
		const routePaths = routes.map((r) => r.path);

		// Assert
		expect(routePaths).toContain("/");
		expect(routePaths).toContain("/vods");
		expect(routePaths).toContain("/vods/$id");
		expect(routePaths).toContain("/vods/$id/session");
		expect(routePaths).toContain("/history");
		expect(routePaths).toContain("/history/$playthroughId");
		expect(routePaths).toContain("/admin");
		expect(routePaths).toContain("/admin/audit");
		expect(routePaths).toContain("/admin/users");
		expect(routePaths).toContain("/admin/content");
		expect(routePaths).toContain("/admin/content/new");
		expect(routePaths).toContain("/admin/content/$vodId");
	});

	it("resolves dynamic parameters with test fixtures", () => {
		// Arrange
		const routeWithId = "/vods/$id";
		const routeWithVodId = "/admin/content/$vodId";
		const routeWithPlaythroughId = "/history/$playthroughId";
		const staticRoute = "/vods";

		// Act
		const resolvedId = resolveRoutePath(routeWithId, {
			id: "vod_local_fixture",
		});
		const resolvedVodId = resolveRoutePath(routeWithVodId, {
			vodId: "vod_local_fixture",
		});
		const resolvedPlaythrough = resolveRoutePath(routeWithPlaythroughId, {
			playthroughId: "playthrough_123",
		});
		const resolvedStatic = resolveRoutePath(staticRoute);

		// Assert
		expect(resolvedId).toBe("/vods/vod_local_fixture");
		expect(resolvedVodId).toBe("/admin/content/vod_local_fixture");
		expect(resolvedPlaythrough).toBe("/history/playthrough_123");
		expect(resolvedStatic).toBe("/vods");
	});

	it("generates state configurations including normal, loading, empty, validation_error, server_error, and modal where applicable", () => {
		// Arrange
		const homeRoute = findRoute("/");
		const vodsRoute = findRoute("/vods");
		const adminContentRoute = findRoute("/admin/content/new");

		// Act
		const homeStates = getRouteStateConfigurations(homeRoute);
		const vodsStates = getRouteStateConfigurations(vodsRoute);
		const adminStates = getRouteStateConfigurations(adminContentRoute);

		// Assert
		expect(homeStates.some((s) => s.state === "default")).toBe(true);
		expect(homeStates.some((s) => s.state === "modal")).toBe(true);
		expect(vodsStates.some((s) => s.state === "loading")).toBe(true);
		expect(vodsStates.some((s) => s.state === "empty")).toBe(true);
		expect(adminStates.some((s) => s.state === "validation_error")).toBe(true);
	});
});

function findRoute(path: string) {
	const found = ROUTE_A11Y_MATRIX.find((r) => r.path === path);
	if (!found) throw new Error(`Route ${path} not found in matrix`);
	return found;
}
