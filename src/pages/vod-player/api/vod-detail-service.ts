import { asc, eq } from "drizzle-orm";

import { checkpoints, vods } from "@/shared/db";
import { getDb, type DbContext } from "@/shared/db/index.server";
import { ApplicationError } from "@/shared/errors";
import { getHeroRole } from "@/shared/vod";

import type { VodDetail } from "../model/vod-detail";

interface GetVodDetailInput extends DbContext {
  vodId: string;
}

async function getVodDetail({ db = getDb(), vodId }: GetVodDetailInput): Promise<VodDetail> {
  const [vod] = await db.select().from(vods).where(eq(vods.id, vodId));

  if (!vod) {
    throw new ApplicationError("VOD_NOT_FOUND", { details: { vodId } });
  }

  const checkpointRows = await db
    .select()
    .from(checkpoints)
    .where(eq(checkpoints.vodId, vod.id))
    .orderBy(asc(checkpoints.timeSec), asc(checkpoints.id));

  return {
    checkpoints: checkpointRows,
    hero: vod.hero,
    id: vod.id,
    map: vod.map,
    role: getHeroRole(vod.hero),
    tier: vod.tier,
    title: vod.title,
    youtubeVideoId: vod.youtubeVideoId,
  };
}

export { getVodDetail };
