import { env } from "cloudflare:workers";
import { asc, eq } from "drizzle-orm";
import { describe, expect, it } from "vite-plus/test";

import { getDb } from "@/shared/db/index.server";
import { checkpoints, vods } from "@/shared/db/schema";

import { seedVods } from "../../vods";

describe("seedVods database seeder", () => {
  it("seeds the three curated OWCS Korea VODs and twelve checkpoints", async () => {
    expect.assertions(8);

    // Arrange
    const db = getDb(env.DB);

    // Act
    await seedVods(db);
    const seededVods = await db.select().from(vods).orderBy(asc(vods.curatedOrder));
    const seededCheckpoints = await db
      .select()
      .from(checkpoints)
      .orderBy(asc(checkpoints.vodId), asc(checkpoints.timeSec));

    // Assert
    expect(seededVods).toHaveLength(3);
    expect(seededCheckpoints).toHaveLength(12);
    expect(seededVods.map((vod) => vod.id)).toStrictEqual([
      "shu-ana-owcs-kr-s3",
      "junbin-winston-owcs-kr-s3",
      "taejong-tracer-owcs-kr-s3",
    ]);
    expect(seededVods[0]).toMatchObject({
      curatedOrder: 1,
      hero: "Ana",
      map: "King's Row",
      tier: "OWCS",
      title: "[ Shu ] Ana Main Madness | Zeta Division vs Team Falcons | OWCS Korea Stage 3",
      youtubeVideoId: "Ha5QwBV3Rhk",
    });

    const junbinCheckpoints = seededCheckpoints.filter(
      (cp) => cp.vodId === "junbin-winston-owcs-kr-s3",
    );
    expect(junbinCheckpoints).toHaveLength(4);
    expect(junbinCheckpoints.map((cp) => cp.skillCategory)).toStrictEqual([
      "Strategy",
      "Tactics",
      "Awareness",
      "Tracking",
    ]);
    expect(junbinCheckpoints[3]?.options).toHaveLength(3);
    expect(junbinCheckpoints[3]?.correctOptionIndex).toBe(0);
  });

  it("is idempotent across repeated invocations", async () => {
    expect.assertions(2);

    // Arrange
    const db = getDb(env.DB);

    // Act
    await seedVods(db);
    await seedVods(db);
    const seededVods = await db.select().from(vods);
    const seededCheckpoints = await db.select().from(checkpoints);

    // Assert
    expect(seededVods).toHaveLength(3);
    expect(seededCheckpoints).toHaveLength(12);
  });

  it("cascades checkpoint deletion when a VOD is deleted", async () => {
    expect.assertions(2);

    // Arrange
    const db = getDb(env.DB);
    await seedVods(db);

    // Act
    await db.delete(vods).where(eq(vods.id, "shu-ana-owcs-kr-s3"));
    const remainingVods = await db.select().from(vods);
    const remainingForShu = await db
      .select()
      .from(checkpoints)
      .where(eq(checkpoints.vodId, "shu-ana-owcs-kr-s3"));

    // Assert
    expect(remainingVods).toHaveLength(2);
    expect(remainingForShu).toHaveLength(0);
  });
});
