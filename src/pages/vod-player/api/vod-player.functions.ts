import { createServerFn } from "@tanstack/react-start";

import { permissionMiddleware } from "@/shared/auth";

import { getVodDetailInputSchema } from "./vod-detail-schema";
import { getVodDetail } from "./vod-detail-service";

const getVodDetailFn = createServerFn({ method: "GET" })
  .middleware([permissionMiddleware("vods:read")])
  .validator(getVodDetailInputSchema)
  .handler(async ({ data }) => await getVodDetail({ vodId: data.vodId }));

export { getVodDetailFn };
