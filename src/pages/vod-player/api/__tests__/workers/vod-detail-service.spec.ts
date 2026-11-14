import { env } from "cloudflare:workers";
import { describe, expect, it } from "vite-plus/test";

import { checkpoints, vods } from "@/shared/db";
import { getDb } from "@/shared/db/index.server";
import { seedVods } from "@/shared/db/seed";
import { ApplicationError } from "@/shared/errors";

import { getVodDetail } from "../../vod-detail-service";

describe("vod-detail-service getVodDetail", () => {
  it("throws ApplicationError VOD_NOT_FOUND when the VOD does not exist", async () => {
    expect.assertions(2);

    // Arrange
    const db = getDb(env.DB);

    // Act
    const action = getVodDetail({ db, vodId: "missing-vod" });

    // Assert
    await expect(action).rejects.toThrow(ApplicationError);
    await expect(action).rejects.toMatchObject({
      code: "VOD_NOT_FOUND",
      statusCode: 404,
    });
  });

  it("returns the VOD with derived role and checkpoints ordered by timeSec ascending", async () => {
    expect.assertions(3);

    // Arrange
    const db = getDb(env.DB);
    await db.insert(vods).values({
      curatedOrder: 1,
      hero: "Winston",
      id: "vod-ordering-test",
      map: "Lijiang Tower",
      tier: "OWCS",
      title: "Winston Ordering Test",
      youtubeVideoId: "nkfn9HK66gg",
    });
    await db.insert(checkpoints).values([
      {
        correctOptionIndex: 1,
        explanation: "Late checkpoint",
        id: "cp-late",
        options: ["A", "B", "C"],
        question: "Late question?",
        skillCategory: "Tracking",
        timeSec: 180,
        vodId: "vod-ordering-test",
      },
      {
        correctOptionIndex: 0,
        explanation: "Early checkpoint",
        id: "cp-early",
        options: ["A", "B", "C", "D"],
        question: "Early question?",
        skillCategory: "Strategy",
        timeSec: 30,
        vodId: "vod-ordering-test",
      },
      {
        correctOptionIndex: 2,
        explanation: "Mid checkpoint",
        id: "cp-mid",
        options: ["A", "B", "C"],
        question: "Mid question?",
        skillCategory: "Awareness",
        timeSec: 95,
        vodId: "vod-ordering-test",
      },
    ]);

    // Act
    const result = await getVodDetail({ db, vodId: "vod-ordering-test" });

    // Assert
    expect(result).toStrictEqual({
      checkpoints: [
        {
          correctOptionIndex: 0,
          explanation: "Early checkpoint",
          id: "cp-early",
          options: ["A", "B", "C", "D"],
          question: "Early question?",
          skillCategory: "Strategy",
          timeSec: 30,
          vodId: "vod-ordering-test",
        },
        {
          correctOptionIndex: 2,
          explanation: "Mid checkpoint",
          id: "cp-mid",
          options: ["A", "B", "C"],
          question: "Mid question?",
          skillCategory: "Awareness",
          timeSec: 95,
          vodId: "vod-ordering-test",
        },
        {
          correctOptionIndex: 1,
          explanation: "Late checkpoint",
          id: "cp-late",
          options: ["A", "B", "C"],
          question: "Late question?",
          skillCategory: "Tracking",
          timeSec: 180,
          vodId: "vod-ordering-test",
        },
      ],
      hero: "Winston",
      id: "vod-ordering-test",
      map: "Lijiang Tower",
      role: "Tank",
      tier: "OWCS",
      title: "Winston Ordering Test",
      youtubeVideoId: "nkfn9HK66gg",
    });
    expect(result.checkpoints.map((cp) => cp.timeSec)).toStrictEqual([30, 95, 180]);
    expect(result.role).toBe("Tank");
  });

  it("returns an empty checkpoints list when the VOD has no checkpoints", async () => {
    expect.assertions(1);

    // Arrange
    const db = getDb(env.DB);
    await db.insert(vods).values({
      curatedOrder: 1,
      hero: "Ana",
      id: "vod-empty-cp",
      map: "King's Row",
      tier: "Ranked GM",
      title: "Ana No Checkpoints",
      youtubeVideoId: "Ha5QwBV3Rhk",
    });

    // Act
    const result = await getVodDetail({ db, vodId: "vod-empty-cp" });

    // Assert
    expect(result.checkpoints).toStrictEqual([]);
  });

  it("uses the default database context when db is omitted", async () => {
    expect.assertions(2);

    // Arrange
    const db = getDb(env.DB);
    await seedVods(db);

    // Act
    const result = await getVodDetail({ vodId: "shu-ana-owcs-kr-s3" });

    // Assert
    expect(result.id).toBe("shu-ana-owcs-kr-s3");
    expect(result.checkpoints.map((cp) => cp.timeSec)).toStrictEqual([45, 110, 185, 260]);
  });
});
