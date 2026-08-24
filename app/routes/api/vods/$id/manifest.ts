import { createFileRoute } from "@tanstack/react-router";
import { vodManifestApiRouteOptions } from "@/entities/vod";

export const Route = createFileRoute("/api/vods/$id/manifest")(
	vodManifestApiRouteOptions,
);
