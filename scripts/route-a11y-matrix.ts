export type AuthRole =
	| "public"
	| "learner"
	| "admin"
	| "unauthorized"
	| "expired";

export type RouteState =
	| "default"
	| "loading"
	| "empty"
	| "populated"
	| "validation_error"
	| "server_error"
	| "modal";

export interface RouteMatrixEntry {
	defaultParams?: Record<string, string>;
	description: string;
	path: string;
	roles: AuthRole[];
	states: RouteState[];
}

export interface RouteStateConfiguration {
	params: Record<string, string>;
	path: string;
	resolvedPath: string;
	role: AuthRole;
	state: RouteState;
}

export const ROUTE_A11Y_MATRIX: ReadonlyArray<RouteMatrixEntry> = [
	{
		description: "Public landing and onboarding page",
		path: "/",
		roles: ["public", "learner", "admin"],
		states: ["default", "modal", "server_error"],
	},
	{
		description: "VOD training catalog list",
		path: "/vods",
		roles: ["public", "learner", "admin"],
		states: ["default", "loading", "empty", "populated", "server_error"],
	},
	{
		defaultParams: { id: "vod_local_fixture" },
		description: "VOD detail and scenario overview",
		path: "/vods/$id",
		roles: ["public", "learner", "admin"],
		states: ["default", "loading", "modal", "server_error"],
	},
	{
		defaultParams: { id: "vod_local_fixture" },
		description: "Interactive session playthrough training environment",
		path: "/vods/$id/session",
		roles: ["learner", "admin", "unauthorized", "expired"],
		states: ["default", "loading", "server_error"],
	},
	{
		description: "Learner playthrough attempt history",
		path: "/history",
		roles: ["learner", "admin", "unauthorized", "expired"],
		states: ["default", "loading", "empty", "populated", "server_error"],
	},
	{
		defaultParams: { playthroughId: "playthrough_local_fixture" },
		description: "Learner specific playthrough performance review",
		path: "/history/$playthroughId",
		roles: ["learner", "admin", "unauthorized", "expired"],
		states: ["default", "loading", "server_error"],
	},
	{
		description: "Administrator overview dashboard",
		path: "/admin",
		roles: ["admin", "unauthorized", "expired"],
		states: ["default", "loading", "server_error"],
	},
	{
		description: "Administrator audit trail",
		path: "/admin/audit",
		roles: ["admin", "unauthorized", "expired"],
		states: ["default", "loading", "empty", "populated", "server_error"],
	},
	{
		description: "Administrator user management",
		path: "/admin/users",
		roles: ["admin", "unauthorized", "expired"],
		states: ["default", "loading", "empty", "populated", "server_error"],
	},
	{
		description: "Administrator content catalog",
		path: "/admin/content",
		roles: ["admin", "unauthorized", "expired"],
		states: ["default", "loading", "empty", "populated", "server_error"],
	},
	{
		description: "Administrator create new VOD form",
		path: "/admin/content/new",
		roles: ["admin", "unauthorized", "expired"],
		states: ["default", "validation_error", "server_error"],
	},
	{
		defaultParams: { vodId: "vod_local_fixture" },
		description: "Administrator edit VOD and scenarios form",
		path: "/admin/content/$vodId",
		roles: ["admin", "unauthorized", "expired"],
		states: ["default", "loading", "validation_error", "server_error"],
	},
];

export function getAuditableRoutes(): ReadonlyArray<RouteMatrixEntry> {
	return ROUTE_A11Y_MATRIX;
}

export function resolveRoutePath(
	routePath: string,
	params: Record<string, string> = {},
): string {
	let resolved = routePath;
	for (const [key, value] of Object.entries(params)) {
		resolved = resolved.replace(`$${key}`, value);
	}
	return resolved;
}

export function getRouteStateConfigurations(
	entry: RouteMatrixEntry,
): RouteStateConfiguration[] {
	const params = entry.defaultParams ?? {};
	const resolvedPath = resolveRoutePath(entry.path, params);

	return entry.states.map((state) => ({
		params,
		path: entry.path,
		resolvedPath,
		role: entry.roles[0],
		state,
	}));
}
