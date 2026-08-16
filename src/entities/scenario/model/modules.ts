import type { ModuleType } from "@/shared/db";
import type { ModuleDefinition } from "./types";

export const DEFAULT_MODULE_TYPES: readonly ModuleType[] = [
	"STRATEGY",
	"TACTICS",
	"ULTIMATE",
	"COOLDOWN",
	"SPATIAL",
] as const;

export const MODULE_DEFINITIONS: readonly ModuleDefinition[] = [
	{
		badge: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
		color: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
		description: "Pre-fight positioning & composition win conditions",
		key: "STRATEGY",
		label: "Strategy",
		tooltip: "Pre-fight positioning & composition win conditions",
	},
	{
		badge: "bg-indigo-500/20 text-indigo-300 border-indigo-500/30",
		color: "bg-indigo-500/20 text-indigo-300 border-indigo-500/30",
		description: "Mid-fight execution & 3s rapid target selection",
		key: "TACTICS",
		label: "Tactics",
		tooltip: "Mid-fight execution & 3s rapid target selection",
	},
	{
		badge: "bg-amber-500/20 text-amber-300 border-amber-500/30",
		color: "bg-amber-500/20 text-amber-300 border-amber-500/30",
		description: "Enemy ultimate charge range estimation",
		key: "ULTIMATE",
		label: "Ultimate Tracking",
		tooltip: "Enemy ultimate charge range estimation",
	},
	{
		badge: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30",
		color: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30",
		description: "Ability availability & cooldown window tracking",
		key: "COOLDOWN",
		label: "Cooldown Tracking",
		tooltip: "Ability availability & cooldown window tracking",
	},
	{
		badge: "bg-purple-500/20 text-purple-300 border-purple-500/30",
		color: "bg-purple-500/20 text-purple-300 border-purple-500/30",
		description: "Flank recognition & situational location assessment",
		key: "SPATIAL",
		label: "Spatial Awareness",
		tooltip: "Flank recognition & situational location assessment",
	},
] as const;

export const MODULE_MAP: Record<ModuleType, ModuleDefinition> =
	MODULE_DEFINITIONS.reduce(
		(acc, def) => {
			acc[def.key] = def;
			return acc;
		},
		{} as Record<ModuleType, ModuleDefinition>,
	);
