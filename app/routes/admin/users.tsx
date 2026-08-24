import { createFileRoute } from "@tanstack/react-router";
import { adminUsersRouteOptions } from "@/pages/admin-users";

export const Route = createFileRoute("/admin/users")(adminUsersRouteOptions);
