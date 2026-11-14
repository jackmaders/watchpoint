import { createServerFn } from "@tanstack/react-start";

import { permissionMiddleware } from "@/shared/auth";

import { getVods } from "./vods-service";

const getVodsFn = createServerFn({ method: "GET" })
  .middleware([permissionMiddleware("vods:read")])
  .handler(async () => await getVods());

export { getVodsFn };
