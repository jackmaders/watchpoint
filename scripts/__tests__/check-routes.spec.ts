import { describe, expect, it } from "vitest";
import { checkRouteInventory } from "../check-routes";

describe("Route Inventory Static Check Script", () => {
	it("returns success with empty error list when all routes match router", () => {
		// Arrange
		const fakeRouteTree = `
export interface FileRoutesByFullPath {
  '/': typeof IndexRoute
  '/admin': typeof AdminRouteWithChildren
  '/admin/audit': typeof AdminAuditRoute
  '/admin/content': typeof AdminContentRoute
  '/admin/users': typeof AdminUsersRoute
  '/history/$playthroughId': typeof HistoryPlaythroughIdRoute
  '/vods/$id': typeof VodsIdRouteWithChildren
  '/admin/': typeof AdminIndexRoute
  '/history/': typeof HistoryIndexRoute
  '/vods/': typeof VodsIndexRoute
  '/api/auth/$': typeof ApiAuthSplatRoute
  '/api/media/$': typeof ApiMediaSplatRoute
  '/vods/$id/session': typeof VodsIdSessionRoute
  '/api/vods/$id/manifest': typeof ApiVodsIdManifestRoute
}
`;

		// Act
		const errors = checkRouteInventory({
			readFile: () => fakeRouteTree,
		});

		// Assert
		expect(errors).toEqual([]);
	});

	it("returns error diagnostic when a route is missing from inventory", () => {
		// Arrange
		const fakeRouteTree = `
export interface FileRoutesByFullPath {
  '/': typeof IndexRoute
  '/new-unregistered-route': typeof NewRoute
}
`;

		// Act
		const errors = checkRouteInventory({
			readFile: () => fakeRouteTree,
		});

		// Assert
		expect(errors).toContain(
			"Route inventory is missing route: /new-unregistered-route",
		);
	});

	it("returns error diagnostic when router file is malformed", () => {
		// Arrange
		const malformedFile = "const hello = 123;";

		// Act
		const errors = checkRouteInventory({
			readFile: () => malformedFile,
		});

		// Assert
		expect(errors).toContain(
			"Failed to extract FileRoutesByFullPath from app/routeTree.gen.ts",
		);
	});
});
