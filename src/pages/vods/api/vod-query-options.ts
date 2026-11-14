import { queryOptions } from "@tanstack/react-query";

import { normalizeVodFilters, type VodCatalogueFilters } from "../model/vod-catalogue";
import { getVodMapsFn, getVodsFn } from "./vods.functions";

const vodKeys = {
  all: ["vods"] as const,
  list: (filters: VodCatalogueFilters) => [...vodKeys.all, "list", filters] as const,
  maps: () => [...vodKeys.all, "maps"] as const,
};

function vodsQueryOptions(filters: VodCatalogueFilters = {}) {
  const normalizedFilters = normalizeVodFilters(filters);

  return queryOptions({
    queryFn: async () => await getVodsFn({ data: normalizedFilters }),
    queryKey: vodKeys.list(normalizedFilters),
  });
}

function vodMapsQueryOptions() {
  return queryOptions({
    queryFn: async () => await getVodMapsFn(),
    queryKey: vodKeys.maps(),
  });
}

export { vodMapsQueryOptions, vodsQueryOptions };
