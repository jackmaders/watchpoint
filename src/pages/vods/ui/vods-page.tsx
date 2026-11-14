import { useSuspenseQuery } from "@tanstack/react-query";

import { Card, CardDescription, CardHeader, CardTitle } from "@/shared/ui/shadcn/card";

import { vodsQueryOptions } from "../api/vod-query-options";
import type { VodCatalogueItem } from "../api/vods-service";
import { VodCard } from "./vod-card";

function VodsPage() {
  const { data: vods } = useSuspenseQuery(vodsQueryOptions());

  return (
    <section className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">VOD Catalogue</h1>
        <p className="text-sm text-muted-foreground">
          Study curated Overwatch POVs with interactive Checkpoint prompts.
        </p>
      </header>
      {vods.length === 0 ? <EmptyVodCatalogue /> : <VodCatalogueGrid vods={vods} />}
    </section>
  );
}

function EmptyVodCatalogue() {
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
