import { createFileRoute } from "@tanstack/react-router";
import { authApiRouteOptions } from "@/shared/lib/auth";

export const Route = createFileRoute("/api/auth/$")(authApiRouteOptions);
