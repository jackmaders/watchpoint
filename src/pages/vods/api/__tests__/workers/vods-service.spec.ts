import { env } from "cloudflare:workers";
import { describe, expect, it } from "vite-plus/test";

import { checkpoints, vods } from "@/shared/db";
import { getDb } from "@/shared/db/index.server";
import { seedVods } from "@/shared/db/seed";

import { getVodMaps, getVods } from "../../vods-service";

const SEARCH_PARAM_KEY = "q";

describe("vods-service getVods", () => {
  it("returns an empty array when no VODs exist", async () => {
    expect.assertions(1);

    // Arrange
    const db = getDb(env.DB);

    // Act
    const result = await getVods({}, { db });

    // Assert
    expect(result).toStrictEqual([]);
  });

  it("uses the default database context when called without arguments", async () => {
    expect.assertions(1);

    // Arrange
    const db = getDb(env.DB);
    await seedVods(db);

    // Act
    const result = await getVods();

    // Assert
    expect(result).toHaveLength(3);
  });

  it("returns curated VODs ordered by curatedOrder with derived role, checkpointCount, and skillCategories", async () => {
    expect.assertions(4);

    // Arrange
    const db = getDb(env.DB);
    await seedVods(db);

    // Act
    const result = await getVods({}, { db });

    // Assert
    expect(result).toHaveLength(3);
    expect(result[0]).toStrictEqual({
      checkpointCount: 4,
      curatedOrder: 1,
      hero: "Ana",
      id: "shu-ana-owcs-kr-s3",
      map: "King's Row",
      role: "Support",
      skillCategories: ["Strategy", "Tactics", "Awareness", "Tracking"],
      tier: "OWCS",
      title: "[ Shu ] Ana Main Madness | Zeta Division vs Team Falcons | OWCS Korea Stage 3",
      youtubeVideoId: "Ha5QwBV3Rhk",
    });
    expect(result[1]).toMatchObject({
      checkpointCount: 4,
      curatedOrder: 2,
      hero: "Winston",
      id: "junbin-winston-owcs-kr-s3",
      map: "Lijiang Tower",
      role: "Tank",
      tier: "OWCS",
    });
    expect(result[2]).toMatchObject({
      checkpointCount: 4,
      curatedOrder: 3,
      hero: "Tracer",
      id: "taejong-tracer-owcs-kr-s3",
      map: "Suravasa",
      role: "Damage",
      tier: "OWCS",
    });
  });

  it("handles VODs with zero checkpoints and deduplicates covered skill categories in canonical order", async () => {
    expect.assertions(2);

    // Arrange
    const db = getDb(env.DB);
    await db.insert(vods).values([
      {
        curatedOrder: 2,
        hero: "Kiriko",
        id: "vod-no-cp",
        map: "Ilios",
        tier: "Ranked GM",
        title: "Kiriko Ranked GM",
        youtubeVideoId: "abc12345678",
      },
      {
        curatedOrder: 1,
        hero: "D.Va",
        id: "vod-dup-cp",
        map: "Busan",
        tier: "FACEIT",
        title: "D.Va FACEIT",
        youtubeVideoId: "def12345678",
      },
    ]);
    await db.insert(checkpoints).values([
      {
        correctOptionIndex: 0,
        explanation: "Track ults",
        id: "cp-1",
        options: ["A", "B", "C"],
        question: "Q1?",
        skillCategory: "Tracking",
        timeSec: 30,
        vodId: "vod-dup-cp",
      },
      {
        correctOptionIndex: 1,
        explanation: "Track cooldowns",
        id: "cp-2",
        options: ["A", "B", "C"],
        question: "Q2?",
        skillCategory: "Tracking",
        timeSec: 60,
        vodId: "vod-dup-cp",
      },
      {
        correctOptionIndex: 0,
        explanation: "Check macro",
        id: "cp-3",
        options: ["A", "B", "C"],
        question: "Q3?",
        skillCategory: "Strategy",
        timeSec: 90,
        vodId: "vod-dup-cp",
      },
    ]);

    // Act
    const result = await getVods({}, { db });

    // Assert
    expect(result[0]).toMatchObject({
      checkpointCount: 3,
      id: "vod-dup-cp",
      role: "Tank",
      skillCategories: ["Strategy", "Tracking"],
    });
    expect(result[1]).toMatchObject({
      checkpointCount: 0,
      id: "vod-no-cp",
      role: "Support",
      skillCategories: [],
    });
  });

  it("matches q case-insensitively against title, hero, and map while escaping LIKE wildcards", async () => {
    expect.assertions(5);

    // Arrange
    const db = getDb(env.DB);
    await seedVods(db);
    await db.insert(vods).values({
      curatedOrder: 4,
      hero: "Soldier: 76",
      id: "soldier-percent-vod",
      map: "Numbani",
      tier: "Ranked Champion",
      title: "100% Accuracy Soldier_76 Drill",
      youtubeVideoId: "xyz12345678",
    });

    // Act
    const byTitle = await getVods({ [SEARCH_PARAM_KEY]: "primal punch" }, { db });
    const byHero = await getVods({ [SEARCH_PARAM_KEY]: "TRACER" }, { db });
    const byMap = await getVods({ [SEARCH_PARAM_KEY]: "king's row" }, { db });
    const literalPercent = await getVods({ [SEARCH_PARAM_KEY]: "100%" }, { db });
    const wildcardOnly = await getVods({ [SEARCH_PARAM_KEY]: "___" }, { db });

    // Assert
    expect(byTitle.map((vod) => vod.id)).toStrictEqual(["junbin-winston-owcs-kr-s3"]);
    expect(byHero.map((vod) => vod.id)).toStrictEqual(["taejong-tracer-owcs-kr-s3"]);
    expect(byMap.map((vod) => vod.id)).toStrictEqual(["shu-ana-owcs-kr-s3"]);
    expect(literalPercent.map((vod) => vod.id)).toStrictEqual(["soldier-percent-vod"]);
    expect(wildcardOnly).toStrictEqual([]);
  });

  it("filters by role via HERO_TO_ROLE, competitive tier, map, and combined criteria", async () => {
    expect.assertions(5);

    // Arrange
    const db = getDb(env.DB);
    await seedVods(db);
    await db.insert(vods).values({
      curatedOrder: 4,
      hero: "Kiriko",
      id: "kiriko-gm-ilios",
      map: "Ilios",
      tier: "Ranked GM",
      title: "Kiriko Ranked GM Ilios",
      youtubeVideoId: "kiriko12345",
    });

    // Act
    const tankVods = await getVods({ role: "Tank" }, { db });
    const supportVods = await getVods({ role: "Support" }, { db });
    const gmVods = await getVods({ tier: "Ranked GM" }, { db });
    const suravasaVods = await getVods({ map: "Suravasa" }, { db });
    const combinedVods = await getVods(
      { map: "Ilios", [SEARCH_PARAM_KEY]: "kiriko", role: "Support", tier: "Ranked GM" },
      { db },
    );

    // Assert
    expect(tankVods.map((vod) => vod.id)).toStrictEqual(["junbin-winston-owcs-kr-s3"]);
    expect(supportVods.map((vod) => vod.id)).toStrictEqual([
      "shu-ana-owcs-kr-s3",
      "kiriko-gm-ilios",
    ]);
    expect(gmVods.map((vod) => vod.id)).toStrictEqual(["kiriko-gm-ilios"]);
    expect(suravasaVods.map((vod) => vod.id)).toStrictEqual(["taejong-tracer-owcs-kr-s3"]);
    expect(combinedVods.map((vod) => vod.id)).toStrictEqual(["kiriko-gm-ilios"]);
  });

  it("sorts by Curated, Map A–Z, Hero A–Z, and Most Checkpoints with curatedOrder tie-breaker", async () => {
    expect.assertions(4);

    // Arrange
    const db = getDb(env.DB);
    await db.insert(vods).values([
      {
        curatedOrder: 3,
        hero: "Zarya",
        id: "vod-zarya",
        map: "Busan",
        tier: "FACEIT",
        title: "Zarya VOD",
        youtubeVideoId: "zarya123456",
      },
      {
        curatedOrder: 1,
        hero: "Ana",
        id: "vod-ana",
        map: "Suravasa",
        tier: "OWCS",
        title: "Ana VOD",
        youtubeVideoId: "ana12345678",
      },
      {
        curatedOrder: 2,
        hero: "Mercy",
        id: "vod-mercy",
        map: "Ilios",
        tier: "Ranked GM",
        title: "Mercy VOD",
        youtubeVideoId: "mercy123456",
      },
    ]);
    await db.insert(checkpoints).values([
      {
        correctOptionIndex: 0,
        explanation: "Exp 1",
        id: "z-cp-1",
        options: ["A", "B", "C"],
        question: "Q1",
        skillCategory: "Strategy",
        timeSec: 10,
        vodId: "vod-zarya",
      },
      {
        correctOptionIndex: 0,
        explanation: "Exp 2",
        id: "z-cp-2",
        options: ["A", "B", "C"],
        question: "Q2",
        skillCategory: "Tactics",
        timeSec: 20,
        vodId: "vod-zarya",
      },
      {
        correctOptionIndex: 0,
        explanation: "Exp 3",
        id: "a-cp-1",
        options: ["A", "B", "C"],
        question: "Q3",
        skillCategory: "Awareness",
        timeSec: 30,
        vodId: "vod-ana",
      },
      {
        correctOptionIndex: 0,
        explanation: "Exp 4",
        id: "a-cp-2",
        options: ["A", "B", "C"],
        question: "Q4",
        skillCategory: "Tracking",
        timeSec: 40,
        vodId: "vod-ana",
      },
    ]);

    // Act
    const curatedOrder = await getVods({ sort: "Curated" }, { db });
    const mapOrder = await getVods({ sort: "Map A–Z" }, { db });
    const heroOrder = await getVods({ sort: "Hero A–Z" }, { db });
    const checkpointsOrder = await getVods({ sort: "Most Checkpoints" }, { db });

    // Assert
    expect(curatedOrder.map((vod) => vod.id)).toStrictEqual(["vod-ana", "vod-mercy", "vod-zarya"]);
    expect(mapOrder.map((vod) => vod.id)).toStrictEqual(["vod-zarya", "vod-mercy", "vod-ana"]);
    expect(heroOrder.map((vod) => vod.id)).toStrictEqual(["vod-ana", "vod-mercy", "vod-zarya"]);
    expect(checkpointsOrder.map((vod) => vod.id)).toStrictEqual([
      "vod-ana",
      "vod-zarya",
      "vod-mercy",
    ]);
  });
});

describe("vods-service getVodMaps", () => {
  it("returns an empty array when no VODs exist", async () => {
    expect.assertions(1);

    // Arrange
    const db = getDb(env.DB);

    // Act
    const maps = await getVodMaps({ db });

    // Assert
    expect(maps).toStrictEqual([]);
  });

  it("returns distinct sorted maps from the catalogue", async () => {
    expect.assertions(2);

    // Arrange
    const db = getDb(env.DB);
    await seedVods(db);
    await db.insert(vods).values({
      curatedOrder: 4,
      hero: "Kiriko",
      id: "duplicate-map-vod",
      map: "King's Row",
      tier: "Ranked GM",
      title: "Duplicate Map VOD",
      youtubeVideoId: "dupmap12345",
    });

    // Act
    const maps = await getVodMaps({ db });
    const defaultMaps = await getVodMaps();

    // Assert
    expect(maps).toStrictEqual(["King's Row", "Lijiang Tower", "Suravasa"]);
    expect(defaultMaps).toStrictEqual(["King's Row", "Lijiang Tower", "Suravasa"]);
  });
});
