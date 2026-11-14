import { describe, expect, it } from "vite-plus/test";

import { HERO_TO_ROLE, ROLES, getHeroRole, getHeroesForRole, type Role } from "../hero-roles";

describe("hero role mapping", () => {
  it("defines the three Overwatch team roles", () => {
    expect.assertions(1);

    // Assert
    expect(ROLES).toStrictEqual(["Tank", "Damage", "Support"]);
  });

  it.each<[string, Role]>([
    ["Winston", "Tank"],
    ["D.Va", "Tank"],
    ["Reinhardt", "Tank"],
    ["Tracer", "Damage"],
    ["Genji", "Damage"],
    ["Soldier: 76", "Damage"],
    ["Ana", "Support"],
    ["Kiriko", "Support"],
    ["Lucio", "Support"],
  ])("derives %s as %s", (hero, expectedRole) => {
    expect.assertions(2);

    // Act
    const role = getHeroRole(hero);

    // Assert
    expect(role).toBe(expectedRole);
    expect(HERO_TO_ROLE[hero]).toBe(expectedRole);
  });

  it.each(["UnknownHero", "", "constructor", "__proto__"])(
    "throws for unrecognized hero %s",
    (hero) => {
      expect.assertions(1);

      // Assert
      expect(() => getHeroRole(hero)).toThrow(`Unknown Overwatch hero: ${hero}`);
    },
  );

  it("returns all mapped heroes belonging to a given role", () => {
    expect.assertions(3);

    // Act
    const tanks = getHeroesForRole("Tank");
    const damage = getHeroesForRole("Damage");
    const supports = getHeroesForRole("Support");

    // Assert
    expect(tanks).toContain("Winston");
    expect(damage).toContain("Tracer");
    expect(supports).toContain("Ana");
  });
});
