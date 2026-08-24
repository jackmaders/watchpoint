import { createFileRoute } from "@tanstack/react-router";
import { adminRouteOptions } from "@/widgets/admin-layout";

export const Route = createFileRoute("/admin")(adminRouteOptions);
