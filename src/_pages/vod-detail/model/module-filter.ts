import type { ModuleType } from "@/shared/db";

const OVERWATCH_HEROES = [
	"Ana",
	"Ashe",
	"Baptiste",
	"Bastion",
	"Brigitte",
	"Cassidy",
	"D.Va",
	"Doomfist",
	"Echo",
	"Genji",
	"Hanzo",
	"Illari",
	"Junker Queen",
	"Junkrat",
	"Juno",
	"Kiriko",
	"Lifeweaver",
	"Lúcio",
	"Lucio",
	"Mauga",
	"Mei",
	"Mercy",
	"Moira",
	"Orisa",
	"Pharah",
	"Ramattra",
	"Reaper",
	"Reinhardt",
	"Roadhog",
	"Sigma",
	"Sojourn",
	"Soldier: 76",
	"Sombra",
	"Symmetra",
	"Torbjörn",
	"Torbjorn",
	"Tracer",
	"Venture",
	"Widowmaker",
	"Winston",
	"Wrecking Ball",
	"Zarya",
	"Zenyatta",
];

export function extractHeroFromTitle(title: string): string | null {
	for (const hero of OVERWATCH_HEROES) {
		const escapedHero = hero.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
		const regex = new RegExp(`\\b${escapedHero}\\b`, "i");
		if (regex.test(title)) {
			return hero;
		}
	}
	return null;
}

export function calculateModuleCounts(
	scenarios: { moduleType: ModuleType }[],
): Record<ModuleType, number> {
	const counts: Record<ModuleType, number> = {
		COOLDOWN: 0,
		SPATIAL: 0,
		STRATEGY: 0,
		TACTICS: 0,
		ULTIMATE: 0,
	};

	for (const scenario of scenarios) {
		counts[scenario.moduleType] += 1;
	}

	return counts;
}

export function serializeModulesParam(modules: ModuleType[]): string {
	return modules.join(",");
}

export function buildSessionUrl(vodId: string, modules: ModuleType[]): string {
	if (modules.length === 0) {
		return "#";
	}
	const params = new URLSearchParams();
	params.set("modules", serializeModulesParam(modules));
	return `/vods/${vodId}/session?${params.toString()}`;
}
