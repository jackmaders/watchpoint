import { createFileRoute } from "@tanstack/react-router";
import { adminAuditRouteOptions } from "@/pages/admin-audit";

export const Route = createFileRoute("/admin/audit")(adminAuditRouteOptions);
