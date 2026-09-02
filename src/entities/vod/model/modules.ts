/**
 * Canonical module definitions, visual styling tokens, and descriptors for the 5 interactive game sense learning modules.
 *
 * Defines `DEFAULT_MODULE_TYPES`, `MODULE_DEFINITIONS`, and `MODULE_MAP` mapping `STRATEGY`, `TACTICS`,
 * `ULTIMATE`, `COOLDOWN`, and `SPATIAL` modules to their respective badge classes, theme colors, and user-facing labels.
 */
import type { ModuleType } from "@/shared/db";

export interface ModuleDefinition {
	badge: string;
	color: string;
	description: string;
	key: ModuleType;
	label: string;
	tooltip: string;
}

export const DEFAULT_MODULE_TYPES: readonly ModuleType[] = [
	"STRATEGY",
	"TACTICS",
	"ULTIMATE",
	"COOLDOWN",
	"SPATIAL",
] as const;

export const MODULE_DEFINITIONS: readonly ModuleDefinition[] = [
	{
		badge: "bg-primary/10 text-primary border-primary/40",
		color: "bg-primary/10 text-primary border-primary/40",
		description: "Pre-fight positioning & composition win conditions",
		key: "STRATEGY",
		label: "Strategy",
		tooltip: "Pre-fight positioning & composition win conditions",
	},
	{
		badge: "bg-accent text-accent-foreground border-border",
		color: "bg-accent text-accent-foreground border-border",
		description: "Mid-fight execution & 3s rapid target selection",
		key: "TACTICS",
		label: "Tactics",
		tooltip: "Mid-fight execution & 3s rapid target selection",
	},
	{
		badge: "bg-secondary text-secondary-foreground border-border",
		color: "bg-secondary text-secondary-foreground border-border",
		description: "Enemy ultimate charge range estimation",
		key: "ULTIMATE",
		label: "Ultimate Tracking",
		tooltip: "Enemy ultimate charge range estimation",
	},
	{
		badge: "bg-muted text-muted-foreground border-border",
		color: "bg-muted text-muted-foreground border-border",
		description: "Ability availability & cooldown window tracking",
		key: "COOLDOWN",
		label: "Cooldown Tracking",
		tooltip: "Ability availability & cooldown window tracking",
	},
	{
		badge: "bg-card text-card-foreground border-border",
		color: "bg-card text-card-foreground border-border",
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
