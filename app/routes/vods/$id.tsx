import { createFileRoute } from "@tanstack/react-router";
import { vodsIdRouteOptions } from "@/pages/vods-id";

export const Route = createFileRoute("/vods/$id")(vodsIdRouteOptions);
