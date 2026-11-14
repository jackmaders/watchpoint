import { createFileRoute } from "@tanstack/react-router";

import { VodsPage, vodsQueryOptions } from "@/pages/vods";

const Route = createFileRoute("/_authenticated/vods/")({
  loader: async ({ context }) => {
    await context.queryClient.query(vodsQueryOptions());
  },
  headers: () => ({ "Cache-Control": "private, no-store" }),
  component: VodsPage,
});

export { Route };
