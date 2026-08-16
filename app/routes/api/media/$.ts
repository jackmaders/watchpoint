import { createFileRoute } from "@tanstack/react-router";
import { handleGetMedia } from "@/_pages/media-asset";

export const Route = createFileRoute("/api/media/$")({
	server: {
		handlers: {
			GET: async ({ request, params }) => {
				const splat = (params as { _splat?: string })._splat;
				return handleGetMedia(request, {
					params: Promise.resolve({ key: splat }),
				});
			},
		},
	},
});
