import { createFileRoute } from "@tanstack/react-router";

import {
  parseVodCatalogueSearch,
  vodMapsQueryOptions,
  VodsPage,
  vodsQueryOptions,
  type VodCatalogueFilters,
} from "@/pages/vods";

const Route = createFileRoute("/_authenticated/vods/")({
  validateSearch: parseVodCatalogueSearch,
  loaderDeps: ({ search }) => search,
  loader: async ({ context, deps }) => {
    await Promise.all([
      context.queryClient.query(vodsQueryOptions(deps)),
      context.queryClient.query(vodMapsQueryOptions()),
    ]);
  },
  headers: () => ({ "Cache-Control": "private, no-store" }),
  component: VodsRoute,
});

function VodsRoute() {
  const filters = Route.useSearch();
  const navigate = Route.useNavigate();

  function handleFiltersChange(nextFilters: VodCatalogueFilters) {
    void navigate({ search: nextFilters });
  }

  return <VodsPage filters={filters} onFiltersChange={handleFiltersChange} />;
}

export { Route };
