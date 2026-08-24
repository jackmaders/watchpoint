import { createFileRoute } from "@tanstack/react-router";
import { vodsRouteOptions } from "@/pages/vods";

export const Route = createFileRoute("/vods/")(vodsRouteOptions);
