import { createFileRoute } from "@tanstack/react-router";
import { adminRouteOptions } from "@/widgets/layout-admin";

export const Route = createFileRoute("/admin")(adminRouteOptions);
