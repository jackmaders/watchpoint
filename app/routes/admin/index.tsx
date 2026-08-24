import { createFileRoute } from "@tanstack/react-router";
import { adminIndexRouteOptions } from "@/pages/admin";

export const Route = createFileRoute("/admin/")(adminIndexRouteOptions);
