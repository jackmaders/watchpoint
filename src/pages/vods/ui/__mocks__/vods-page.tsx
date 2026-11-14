import type { VodCatalogueFilters } from "../../model/vod-catalogue";

function VodsPage({
  filters,
  onFiltersChange,
}: {
  filters: VodCatalogueFilters;
  onFiltersChange: (nextFilters: VodCatalogueFilters) => void;
}) {
  return (
    <div>
      <h1>VOD Catalogue Page</h1>
      <p>{JSON.stringify(filters)}</p>
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
