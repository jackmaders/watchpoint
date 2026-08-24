import { createFileRoute } from "@tanstack/react-router";
import { adminContentIdRouteOptions } from "@/pages/admin-content-id";

export const Route = createFileRoute("/admin/content/$id")(
	adminContentIdRouteOptions,
);
