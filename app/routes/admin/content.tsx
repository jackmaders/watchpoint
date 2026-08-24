import { createFileRoute } from "@tanstack/react-router";
import { adminContentRouteOptions } from "@/pages/admin-content";

export const Route = createFileRoute("/admin/content")(
	adminContentRouteOptions,
);
