import type { ModuleType } from "@/shared/db";
import type { ModuleDefinition } from "./modules";
import { DEFAULT_MODULE_TYPES, MODULE_MAP } from "./modules";

const MODULE_TYPE_SET = new Set<string>(DEFAULT_MODULE_TYPES);

export function isModuleType(value: unknown): value is ModuleType {
	return typeof value === "string" && MODULE_TYPE_SET.has(value);
}

export function getModuleDefinition(
	key: ModuleType | string,
): ModuleDefinition | undefined {
	if (!isModuleType(key)) {
		return undefined;
	}
	return MODULE_MAP[key];
}

export function getModuleLabel(key: ModuleType): string {
	const def = MODULE_MAP[key];
	return def ? def.label : key;
}

export function getModuleBadge(key: ModuleType): string {
	const def = MODULE_MAP[key];
	return def ? def.badge : "";
}

export function getModuleDescription(key: ModuleType): string {
	const def = MODULE_MAP[key];
	return def ? def.description : "";
}

export function calculateModuleCounts(
	scenarios: readonly { moduleType: ModuleType }[],
): Record<ModuleType, number> {
	const counts: Record<ModuleType, number> = {
		COOLDOWN: 0,
		SPATIAL: 0,
		STRATEGY: 0,
		TACTICS: 0,
		ULTIMATE: 0,
	};

	for (const scenario of scenarios) {
		if (scenario.moduleType in counts) {
			counts[scenario.moduleType] += 1;
		}
	}

	return counts;
}

export function filterScenariosByModules<T extends { moduleType: ModuleType }>(
	scenarios: readonly T[],
	activeModules: readonly ModuleType[] | ReadonlySet<ModuleType>,
): T[] {
	const activeSet =
		activeModules instanceof Set ? activeModules : new Set(activeModules);
	return scenarios.filter((scenario) => activeSet.has(scenario.moduleType));
}

export function parseModuleTypes(
	raw: string | string[] | null | undefined,
): ModuleType[] {
	if (!raw) {
		return [];
	}

	const tokens =
		typeof raw === "string"
			? raw.split(",").map((token) => token.trim())
			: Array.isArray(raw)
				? raw
				: [];

	return tokens.filter((token): token is ModuleType => isModuleType(token));
}
