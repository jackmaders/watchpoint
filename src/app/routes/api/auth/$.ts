// biome-ignore-all lint/style/useNamingConvention: TanStack Start requires HTTP method handler names.

import { createFileRoute } from "@tanstack/react-router";
import { auth } from "@/shared/auth/index.server";

export const Route = createFileRoute("/api/auth/$")({
	server: {
		handlers: {
			GET: ({ request }) => auth.handler(request),
			POST: ({ request }) => auth.handler(request),
		},
	},
});
