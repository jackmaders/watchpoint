import { createFileRoute } from "@tanstack/react-router";

import { VodPlayerPage, vodDetailQueryOptions } from "@/pages/vod-player";

const Route = createFileRoute("/_authenticated/vods/$vodId/")({
  loader: async ({ context, params }) => {
    await context.queryClient.query(vodDetailQueryOptions(params.vodId));
  },
  headers: () => ({ "Cache-Control": "private, no-store" }),
  component: VodPlayerRoute,
});

function VodPlayerRoute() {
  const { vodId } = Route.useParams();
  return <VodPlayerPage vodId={vodId} />;
}

export { Route };
