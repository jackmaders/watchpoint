import { createFileRoute } from "@tanstack/react-router";
import { historyRouteOptions } from "@/pages/history";

export const Route = createFileRoute("/history/")(historyRouteOptions);
