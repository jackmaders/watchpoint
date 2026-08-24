import { createFileRoute } from "@tanstack/react-router";
import { mediaApiRouteOptions } from "@/shared/media";

export const Route = createFileRoute("/api/media/$")(mediaApiRouteOptions);
