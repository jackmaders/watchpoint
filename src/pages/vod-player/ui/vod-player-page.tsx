import { useSuspenseQuery } from "@tanstack/react-query";

import { vodDetailQueryOptions } from "../api/vod-detail-query-options";

interface VodPlayerPageProps {
  vodId: string;
}

function VodPlayerPage({ vodId }: VodPlayerPageProps) {
  const { data: vod } = useSuspenseQuery(vodDetailQueryOptions(vodId));

  return (
    <section className="space-y-4">
      <h1 className="text-lg font-semibold">{vod.title}</h1>
    </section>
  );
}

export { VodPlayerPage };
