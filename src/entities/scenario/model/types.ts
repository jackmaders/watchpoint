import type { ModuleType } from "@/shared/db";

export interface ModuleDefinition {
	badge: string;
	color: string;
	description: string;
	key: ModuleType;
	label: string;
	tooltip: string;
}
