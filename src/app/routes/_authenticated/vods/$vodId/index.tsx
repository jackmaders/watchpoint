import { createFileRoute, notFound } from "@tanstack/react-router";

import { VodPlayerPage, vodDetailQueryOptions } from "@/pages/vod-player";
import { ApplicationError } from "@/shared/errors";

const Route = createFileRoute("/_authenticated/vods/$vodId/")({
  loader: async ({ context, params }) => {
    try {
      await context.queryClient.query(vodDetailQueryOptions(params.vodId));
    } catch (error) {
      if (error instanceof ApplicationError && error.code === "VOD_NOT_FOUND") {
        notFound({ throw: true });
      }

      throw error;
    }
  },
  headers: () => ({ "Cache-Control": "private, no-store" }),
  component: VodPlayerRoute,
});

function VodPlayerRoute() {
  const { vodId } = Route.useParams();
  return <VodPlayerPage vodId={vodId} />;
}

export { Route };
