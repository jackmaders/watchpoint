import { createFileRoute } from "@tanstack/react-router";
import { historyIdRouteOptions } from "@/pages/history-id";

export const Route = createFileRoute("/history/$id")(historyIdRouteOptions);
