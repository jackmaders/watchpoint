import { useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";

import { Button } from "@/shared/ui/shadcn/button";
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from "@/shared/ui/shadcn/card";

import { vodMapsQueryOptions, vodsQueryOptions } from "../api/vod-query-options";
import {
  normalizeVodFilters,
  type VodCatalogueFilters,
  type VodCatalogueItem,
} from "../model/vod-catalogue";
import { VodCard } from "./vod-card";
import { VodCatalogueControls } from "./vod-catalogue-controls";

interface VodsPageProps {
  controlFilters?: VodCatalogueFilters | undefined;
  filters: VodCatalogueFilters;
  onFiltersChange: (nextFilters: VodCatalogueFilters) => void;
}

function VodsPage({ controlFilters, filters, onFiltersChange }: VodsPageProps) {
  const { data: vods } = useSuspenseQuery(vodsQueryOptions(filters));
  const { data: maps } = useSuspenseQuery(vodMapsQueryOptions());
  const [clearCount, setClearCount] = useState(0);
  const normalizedFilters = normalizeVodFilters(filters);
  const hasActiveFilters = [
    normalizedFilters.q,
    normalizedFilters.role,
    normalizedFilters.tier,
    normalizedFilters.map,
  ].some((value) => value !== undefined);

  return (
    <section className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">VOD Catalogue</h1>
        <p className="text-sm text-muted-foreground">
          Study curated Overwatch POVs with interactive Checkpoint prompts.
        </p>
      </header>
      <VodCatalogueControls
        clearCount={clearCount}
        filters={controlFilters ?? filters}
        maps={maps}
        onFiltersChange={onFiltersChange}
      />
      {vods.length === 0 ? (
        <EmptyVodCatalogue
          hasActiveFilters={hasActiveFilters}
          onClearFilters={() => {
            setClearCount((count) => count + 1);
            onFiltersChange({});
          }}
        />
      ) : (
        <VodCatalogueGrid vods={vods} />
      )}
    </section>
  );
}

function EmptyVodCatalogue({
  hasActiveFilters,
  onClearFilters,
}: {
  hasActiveFilters: boolean;
  onClearFilters: () => void;
}) {
  if (hasActiveFilters) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No matching VODs</CardTitle>
          <CardDescription>
            Try adjusting your search or filter criteria to see more VODs.
          </CardDescription>
        </CardHeader>
        <CardFooter>
          <Button onClick={onClearFilters} type="button" variant="outline">
            Clear filters
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>No VODs available</CardTitle>
        <CardDescription>
          Seeded Overwatch VODs will appear here once added to the catalogue.
        </CardDescription>
      </CardHeader>
    </Card>
  );
}

function VodCatalogueGrid({ vods }: { vods: VodCatalogueItem[] }) {
  return (
    <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {vods.map((vod) => (
        <li key={vod.id}>
          <VodCard vod={vod} />
        </li>
      ))}
    </ul>
  );
}

export { VodsPage };
