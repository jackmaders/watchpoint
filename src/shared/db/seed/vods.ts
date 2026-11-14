import type { Database } from "../index.server";
import { checkpoints, type NewCheckpoint, type NewVod, vods } from "../schema";
import { SEED_CHECKPOINTS, SEED_VODS } from "./vod-data";

async function seedVods(db: Database): Promise<void> {
  await Promise.all(
    SEED_VODS.map(async (vod) => {
      await upsertVod(db, vod);
    }),
  );
  await Promise.all(
    SEED_CHECKPOINTS.map(async (checkpoint) => {
      await upsertCheckpoint(db, checkpoint);
    }),
  );
}

async function upsertVod(db: Database, vod: NewVod): Promise<void> {
  await db
    .insert(vods)
    .values(vod)
    .onConflictDoUpdate({
      set: {
        curatedOrder: vod.curatedOrder,
        hero: vod.hero,
        map: vod.map,
        tier: vod.tier,
        title: vod.title,
        youtubeVideoId: vod.youtubeVideoId,
      },
      target: vods.id,
    });
}

async function upsertCheckpoint(db: Database, checkpoint: NewCheckpoint): Promise<void> {
  await db
    .insert(checkpoints)
    .values(checkpoint)
    .onConflictDoUpdate({
      set: {
        correctOptionIndex: checkpoint.correctOptionIndex,
        explanation: checkpoint.explanation,
        options: checkpoint.options,
        question: checkpoint.question,
        skillCategory: checkpoint.skillCategory,
        timeSec: checkpoint.timeSec,
        vodId: checkpoint.vodId,
      },
      target: checkpoints.id,
    });
}

export { seedVods };
