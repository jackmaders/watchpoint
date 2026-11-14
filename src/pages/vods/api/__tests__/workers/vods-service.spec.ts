import { env } from "cloudflare:workers";
import { describe, expect, it } from "vite-plus/test";

import { checkpoints, vods } from "@/shared/db";
import { getDb } from "@/shared/db/index.server";
import { seedVods } from "@/shared/db/seed";

import { getVods } from "../../vods-service";

describe("vods-service getVods", () => {
  it("returns an empty array when no VODs exist", async () => {
    expect.assertions(1);

    // Arrange
    const db = getDb(env.DB);

    // Act
    const result = await getVods({ db });

    // Assert
    expect(result).toStrictEqual([]);
  });

  it("returns curated VODs ordered by curatedOrder with derived role, checkpointCount, and skillCategories", async () => {
    expect.assertions(4);

    // Arrange
    const db = getDb(env.DB);
    await seedVods(db);

    // Act
    const result = await getVods({ db });

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
    const result = await getVods({ db });

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
});
