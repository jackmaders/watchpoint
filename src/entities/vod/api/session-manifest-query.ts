/**
 * Validation and normalization helpers for session manifest query parameters.
 *
 * Normalizes incoming learning module filter strings and arrays into canonical `ModuleType[]` tokens,
 * stripping invalid entries and enforcing Zod schema validation for transport queries.
 */
import { z } from "zod";
import { type ModuleType, moduleTypeEnum } from "@/shared/db";

const moduleFilterInputSchema = z.union([z.string(), z.array(z.string())]);
const sessionManifestTransportQuerySchema = z.object({
	modules: moduleFilterInputSchema.optional(),
	publishedOnly: z.boolean().optional(),
	vodId: z.string().min(1),
});

export interface SessionManifestTransportQuery {
	modules?: string | readonly string[];
	publishedOnly?: boolean;
	vodId: string;
}

export interface NormalizedSessionManifestQuery {
	modules?: readonly ModuleType[] | null;
	publishedOnly?: boolean;
	vodId: string;
}

export function normalizeSessionManifestModules(
	modules?: unknown,
): readonly ModuleType[] | null | undefined {
	if (modules === undefined) {
		return undefined;
	}

	const parsedModules = moduleFilterInputSchema.parse(modules);
	const rawTokens =
		typeof parsedModules === "string"
			? parsedModules.split(",")
			: parsedModules.flatMap((module) => module.split(","));
	const tokens = rawTokens
		.map((module) => module.trim().toUpperCase())
		.filter(Boolean);

	if (tokens.length === 0) {
		return undefined;
	}

	const validModules = Array.from(
		new Set(
			tokens.filter((module): module is ModuleType =>
				moduleTypeEnum.includes(module as ModuleType),
			),
		),
	);

	return validModules.length > 0 ? validModules : null;
}

export function normalizeSessionManifestQuery(
	query: unknown,
): NormalizedSessionManifestQuery {
	const parsedQuery = sessionManifestTransportQuerySchema.parse(query);

	return {
		modules: normalizeSessionManifestModules(parsedQuery.modules),
		publishedOnly: parsedQuery.publishedOnly,
		vodId: parsedQuery.vodId,
	};
}
