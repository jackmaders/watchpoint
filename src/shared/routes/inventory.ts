import type { FileRoutesByFullPath } from "../../../app/routeTree.gen";
import { FIXTURE_IDS } from "../db/seed";

export const ACCESS_STATES = [
	"public",
	"authenticated_user",
	"admin",
	"registration_disabled",
] as const;

export type AccessState = (typeof ACCESS_STATES)[number];

export type RouterFullPath = keyof FileRoutesByFullPath;

export interface RouteInventoryEntry {
	accessStates: readonly AccessState[];
	description?: string;
	fullPath: RouterFullPath;
	isUserFacing: boolean;
	paramFixtures?: Record<string, string>;
}

export const ROUTE_FIXTURE_PARAMS: Record<string, string> = {
	id: FIXTURE_IDS.vod,
	playthroughId: "playthrough_local_fixture",
	vodId: FIXTURE_IDS.vod,
};

export const DEFAULT_ROUTE_INVENTORY: readonly RouteInventoryEntry[] = [
	{
		accessStates: ["public", "authenticated_user", "registration_disabled"],
		description: "Landing and marketing home page",
		fullPath: "/",
		isUserFacing: true,
	},
	{
		accessStates: ["admin"],
		description: "Administrator root redirect",
		fullPath: "/admin",
		isUserFacing: false,
	},
	{
		accessStates: ["admin"],
		description: "Administrator dashboard overview",
		fullPath: "/admin/",
		isUserFacing: true,
	},
	{
		accessStates: ["admin"],
		description: "Administrator audit and telemetry logs",
		fullPath: "/admin/audit",
		isUserFacing: true,
	},
	{
		accessStates: ["admin"],
		description: "Administrator content and VOD catalog management",
		fullPath: "/admin/content",
		isUserFacing: true,
	},
	{
		accessStates: ["admin"],
		description: "Administrator VOD editor and scenario authoring",
		fullPath: "/admin/content/$id",
		isUserFacing: true,
		paramFixtures: { id: FIXTURE_IDS.vod },
	},
	{
		accessStates: ["admin"],
		description: "Administrator new VOD creation page",
		fullPath: "/admin/content/new",
		isUserFacing: true,
	},
	{
		accessStates: ["admin"],
		description: "Administrator user roster and role permissions",
		fullPath: "/admin/users",
		isUserFacing: true,
	},
	{
		accessStates: ["public", "authenticated_user"],
		description: "VOD catalog page",
		fullPath: "/vods/",
		isUserFacing: true,
	},
	{
		accessStates: ["public", "authenticated_user", "registration_disabled"],
		description: "VOD detail and session configuration page",
		fullPath: "/vods/$id",
		isUserFacing: true,
		paramFixtures: { id: FIXTURE_IDS.vod },
	},
	{
		accessStates: ["authenticated_user"],
		description: "Interactive VOD training session player",
		fullPath: "/vods/$id/session",
		isUserFacing: true,
		paramFixtures: { id: FIXTURE_IDS.vod },
	},
	{
		accessStates: ["authenticated_user"],
		description: "Player performance history list",
		fullPath: "/history/",
		isUserFacing: true,
	},
	{
		accessStates: ["authenticated_user"],
		description: "Player playthrough history breakdown detail",
		fullPath: "/history/$id",
		isUserFacing: true,
		paramFixtures: { id: "playthrough_local_fixture" },
	},
	{
		accessStates: ["public"],
		description: "Better-Auth authentication handler endpoint",
		fullPath: "/api/auth/$",
		isUserFacing: false,
	},
	{
		accessStates: ["public"],
		description: "Media storage proxy endpoint",
		fullPath: "/api/media/$",
		isUserFacing: false,
	},
	{
		accessStates: ["authenticated_user"],
		description: "VOD interactive timeline manifest JSON endpoint",
		fullPath: "/api/vods/$id/manifest",
		isUserFacing: false,
		paramFixtures: { id: FIXTURE_IDS.vod },
	},
] as const;

export function resolveRoutePath(
	routePath: string,
	customParams?: Record<string, string>,
): string {
	const params = { ...ROUTE_FIXTURE_PARAMS, ...customParams };
	return routePath.replace(/\$([a-zA-Z0-9_]+)/g, (match, paramName) => {
		return params[paramName] ?? match;
	});
}

export interface RouteInventoryValidationResult {
	isValid: boolean;
	missingRoutes: string[];
	unresolvableRoutes: string[];
}

export function validateRouteInventory(
	inventory: readonly RouteInventoryEntry[],
	allRouterFullPaths: readonly string[],
): RouteInventoryValidationResult {
	const inventoryMap = new Map<string, RouteInventoryEntry>(
		inventory.map((entry) => [entry.fullPath, entry]),
	);
	const missingRoutes: string[] = [];
	const unresolvableRoutes: string[] = [];

	for (const path of allRouterFullPaths) {
		const entry = inventoryMap.get(path);
		if (!entry) {
			missingRoutes.push(path);
		}
	}

	for (const entry of inventory) {
		if (entry.isUserFacing) {
			const resolved = resolveRoutePath(entry.fullPath, entry.paramFixtures);
			if (resolved.includes("$")) {
				unresolvableRoutes.push(entry.fullPath);
			}
		}
	}

	return {
		isValid: missingRoutes.length === 0 && unresolvableRoutes.length === 0,
		missingRoutes,
		unresolvableRoutes,
	};
}
