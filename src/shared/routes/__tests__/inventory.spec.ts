import { describe, expect, it } from "vitest";
import {
	ACCESS_STATES,
	DEFAULT_ROUTE_INVENTORY,
	resolveRoutePath,
	validateRouteInventory,
} from "../inventory";

describe("Route Inventory Manifest", () => {
	it("exposes all user-facing access states", () => {
		// Arrange
		const expected = [
			"public",
			"authenticated_user",
			"admin",
			"registration_disabled",
		];

		// Act
		const states = ACCESS_STATES;

		// Assert
		expect(states).toEqual(expected);
	});

	it("resolves static and dynamic route paths with fixture parameters", () => {
		// Arrange
		const staticRoute = "/";
		const dynamicVodRoute = "/vods/$id";
		const dynamicSessionRoute = "/vods/$id/session";
		const dynamicHistoryRoute = "/history/$id";

		// Act
		const resolvedStatic = resolveRoutePath(staticRoute);
		const resolvedVod = resolveRoutePath(dynamicVodRoute);
		const resolvedSession = resolveRoutePath(dynamicSessionRoute);
		const resolvedHistory = resolveRoutePath(dynamicHistoryRoute);

		// Assert
		expect(resolvedStatic).toBe("/");
		expect(resolvedVod).toBe("/vods/vod_local_fixture");
		expect(resolvedSession).toBe("/vods/vod_local_fixture/session");
		expect(resolvedHistory).toBe("/history/vod_local_fixture");
	});

	it("validates that all user-facing routes are declared in the inventory", () => {
		// Arrange
		const fullPaths = [
			"/",
			"/admin",
			"/admin/audit",
			"/admin/content",
			"/admin/content/$id",
			"/admin/content/new",
			"/admin/users",
			"/history/$id",
			"/vods/$id",
			"/admin/",
			"/history/",
			"/vods/",
			"/api/auth/$",
			"/api/media/$",
			"/vods/$id/session",
			"/api/vods/$id/manifest",
		];

		// Act
		const result = validateRouteInventory(DEFAULT_ROUTE_INVENTORY, fullPaths);

		// Assert
		expect(result.isValid).toBe(true);
		expect(result.missingRoutes).toEqual([]);
		expect(result.unresolvableRoutes).toEqual([]);
	});

	it("detects missing user-facing routes when router adds a new page", () => {
		// Arrange
		const fullPaths = ["/", "/vods/", "/new-feature"];

		// Act
		const result = validateRouteInventory(DEFAULT_ROUTE_INVENTORY, fullPaths);

		// Assert
		expect(result.isValid).toBe(false);
		expect(result.missingRoutes).toContain("/new-feature");
	});

	it("flags dynamic routes missing fixture parameters", () => {
		// Arrange
		const customInventory = [
			{
				accessStates: ["public" as const],
				fullPath:
					"/custom/$unknownParam" as unknown as (typeof DEFAULT_ROUTE_INVENTORY)[number]["fullPath"],
				isUserFacing: true,
			},
		];

		// Act
		const result = validateRouteInventory(customInventory, [
			"/custom/$unknownParam",
		]);

		// Assert
		expect(result.isValid).toBe(false);
		expect(result.unresolvableRoutes).toContain("/custom/$unknownParam");
	});
});
