import { createFileRoute } from "@tanstack/react-router";
import { adminContentNewRouteOptions } from "@/pages/admin-content-new";

export const Route = createFileRoute("/admin/content/new")(
	adminContentNewRouteOptions,
);
