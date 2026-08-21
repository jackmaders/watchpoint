import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
	DEFAULT_ROUTE_INVENTORY,
	validateRouteInventory,
} from "../src/shared/routes/inventory";

export interface CheckRouteOptions {
	readFile?: (path: string) => string;
	root?: string;
}

export function extractRouterFullPaths(
	routeTreeSource: string,
): string[] | null {
	const interfaceMatch = routeTreeSource.match(
		/export\s+interface\s+FileRoutesByFullPath\s*\{([\s\S]*?)\}/,
	);
	if (!interfaceMatch?.[1]) {
		return null;
	}

	const body = interfaceMatch[1];
	const lines = body.split("\n");
	const paths: string[] = [];

	for (const line of lines) {
		const match = line.match(/['"]([^'"]+)['"]\s*:/);
		if (match?.[1]) {
			paths.push(match[1]);
		}
	}

	return paths;
}

export function checkRouteInventory(options: CheckRouteOptions = {}): string[] {
	const root = options.root ?? process.cwd();
	const readFile =
		options.readFile ?? ((path: string) => readFileSync(path, "utf-8"));
	const routeTreePath = join(root, "app/routeTree.gen.ts");

	let source: string;
	try {
		source = readFile(routeTreePath);
	} catch (error) {
		return [
			`Failed to read route tree file at ${routeTreePath}: ${error instanceof Error ? error.message : String(error)}`,
		];
	}

	const routerPaths = extractRouterFullPaths(source);
	if (!routerPaths) {
		return ["Failed to extract FileRoutesByFullPath from app/routeTree.gen.ts"];
	}

	const validation = validateRouteInventory(
		DEFAULT_ROUTE_INVENTORY,
		routerPaths,
	);

	const errors: string[] = [];
	for (const missing of validation.missingRoutes) {
		errors.push(`Route inventory is missing route: ${missing}`);
	}
	for (const unresolvable of validation.unresolvableRoutes) {
		errors.push(
			`Route inventory contains unresolvable fixture parameters for: ${unresolvable}`,
		);
	}

	return errors;
}

if (import.meta.main) {
	const errors = checkRouteInventory();
	if (errors.length > 0) {
		console.error("Route inventory verification failed:");
		for (const error of errors) {
			console.error(`- ${error}`);
		}
		process.exit(1);
	}
	console.log("Route inventory verification passed: 100% routes covered.");
}
