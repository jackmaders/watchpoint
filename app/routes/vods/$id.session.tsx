import { createFileRoute } from "@tanstack/react-router";
import { vodsIdSessionRouteOptions } from "@/pages/vods-id-session";

export const Route = createFileRoute("/vods/$id/session")(
	vodsIdSessionRouteOptions,
);
