import { queryOptions } from "@tanstack/react-query";

import { getVodDetailFn } from "./vod-player.functions";

const vodDetailKeys = {
  all: ["vods"] as const,
  detail: (vodId: string) => [...vodDetailKeys.all, "detail", vodId] as const,
};

function vodDetailQueryOptions(vodId: string) {
  return queryOptions({
    queryFn: async () => await getVodDetailFn({ data: { vodId } }),
    queryKey: vodDetailKeys.detail(vodId),
  });
}

export { vodDetailQueryOptions };
