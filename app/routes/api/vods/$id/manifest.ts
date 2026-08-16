import { createFileRoute } from "@tanstack/react-router";
import { handleGetVodManifest } from "@/pages/vod-detail";

export const Route = createFileRoute("/api/vods/$id/manifest")({
	server: {
		handlers: {
			GET: async ({ request, params }) => {
				return handleGetVodManifest(request, {
					params: Promise.resolve({ id: params.id }),
				});
			},
		},
	},
});
