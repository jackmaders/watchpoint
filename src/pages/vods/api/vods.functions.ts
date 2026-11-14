import { createServerFn } from "@tanstack/react-start";

import { permissionMiddleware } from "@/shared/auth";

import { vodsQueryInputSchema } from "../model/vod-catalogue";
import { getVodMaps, getVods } from "./vods-service";

const getVodsFn = createServerFn({ method: "GET" })
  .middleware([permissionMiddleware("vods:read")])
  .validator(vodsQueryInputSchema)
  .handler(async ({ data }) => await getVods(data));

const getVodMapsFn = createServerFn({ method: "GET" })
  .middleware([permissionMiddleware("vods:read")])
  .handler(async () => await getVodMaps());

export { getVodMapsFn, getVodsFn };
