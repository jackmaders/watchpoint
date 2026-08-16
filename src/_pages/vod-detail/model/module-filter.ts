import type { ModuleType } from "@/shared/db";

export const OVERWATCH_HEROES = [
	"Ana",
	"Anran",
	"Ashe",
	"Baptiste",
	"Bastion",
	"Brigitte",
	"Cassidy",
	"D.Mon",
	"D.Va",
	"Domina",
	"Doomfist",
	"Echo",
	"Emre",
	"Genji",
	"Hanzo",
	"Hazard",
	"Illari",
	"Jetpack Cat",
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
	"Mizuki",
	"Moira",
	"Orisa",
	"Pharah",
	"Ramattra",
	"Reaper",
	"Reinhardt",
	"Roadhog",
	"Sigma",
	"Sierra",
	"Sojourn",
	"Soldier: 76",
	"Sombra",
	"Space Ranger",
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
] as const;

export type OverwatchHero = (typeof OVERWATCH_HEROES)[number];

export function extractHeroFromTitle(title: string): OverwatchHero | null {
	for (const hero of OVERWATCH_HEROES) {
		const escapedHero = hero.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
		const regex = new RegExp(`\\b${escapedHero}\\b`, "i");
		if (regex.test(title)) {
			return hero;
		}
	}
	return null;
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
