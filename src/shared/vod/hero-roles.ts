const ROLES = ["Tank", "Damage", "Support"] as const;

type Role = (typeof ROLES)[number];

const HERO_TO_ROLE: Record<string, Role> = {
  Ana: "Support",
  Ashe: "Damage",
  Baptiste: "Support",
  Bastion: "Damage",
  Brigitte: "Support",
  Cassidy: "Damage",
  "D.Va": "Tank",
  Doomfist: "Tank",
  Echo: "Damage",
  Genji: "Damage",
  Hanzo: "Damage",
  Hazard: "Tank",
  Illari: "Support",
  "Junker Queen": "Tank",
  Junkrat: "Damage",
  Juno: "Support",
  Kiriko: "Support",
  Lifeweaver: "Support",
  Lucio: "Support",
  Mauga: "Tank",
  Mei: "Damage",
  Mercy: "Support",
  Moira: "Support",
  Orisa: "Tank",
  Pharah: "Damage",
  Ramattra: "Tank",
  Reaper: "Damage",
  Reinhardt: "Tank",
  Roadhog: "Tank",
  Sigma: "Tank",
  Sojourn: "Damage",
  "Soldier: 76": "Damage",
  Sombra: "Damage",
  Symmetra: "Damage",
  Torbjorn: "Damage",
  Tracer: "Damage",
  Venture: "Damage",
  Widowmaker: "Damage",
  Winston: "Tank",
  "Wrecking Ball": "Tank",
  Zarya: "Tank",
  Zenyatta: "Support",
};

const HERO_ROLE_MAP = new Map<string, Role>(Object.entries(HERO_TO_ROLE));

function getHeroRole(hero: string): Role {
  const role = HERO_ROLE_MAP.get(hero);
  if (!role) {
    throw new Error(`Unknown Overwatch hero: ${hero}`);
  }
  return role;
}

function getHeroesForRole(role: Role): string[] {
  return Object.entries(HERO_TO_ROLE)
    .filter(([, heroRole]) => heroRole === role)
    .map(([hero]) => hero);
}

export { ROLES, getHeroRole, getHeroesForRole, type Role };

/** @internal Exported solely to enable enhanced testability. */
export { HERO_TO_ROLE };
