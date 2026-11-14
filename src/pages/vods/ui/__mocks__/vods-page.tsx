import type { VodCatalogueFilters } from "../../model/vod-catalogue";

function VodsPage({
  controlFilters,
  filters,
  onFiltersChange,
}: {
  controlFilters?: VodCatalogueFilters | undefined;
  filters: VodCatalogueFilters;
  onFiltersChange: (nextFilters: VodCatalogueFilters) => void;
}) {
  return (
    <div>
      <h1>VOD Catalogue Page</h1>
      <p>{JSON.stringify(filters)}</p>
      <p>{`controls:${JSON.stringify(controlFilters ?? filters)}`}</p>
      <button
        onClick={() => {
          onFiltersChange({ role: "Support" });
        }}
        type="button"
      >
        Apply Mock Filter
      </button>
    </div>
  );
}

export { VodsPage };
