import { createFileRoute } from "@tanstack/react-router";
import { homeRouteOptions } from "@/pages/home";

export const Route = createFileRoute("/")(homeRouteOptions);
