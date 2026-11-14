import { queryOptions } from "@tanstack/react-query";

import { getVodsFn } from "./vods.functions";

const vodKeys = {
  all: ["vods"] as const,
  list: () => [...vodKeys.all, "list"] as const,
};

function vodsQueryOptions() {
  return queryOptions({
    queryFn: async () => await getVodsFn(),
    queryKey: vodKeys.list(),
  });
}

export { vodsQueryOptions };
