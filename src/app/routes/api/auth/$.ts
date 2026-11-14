import { createFileRoute } from "@tanstack/react-router";

const Route = createFileRoute("/api/auth/$")({
  server: {
    handlers: {
      GET: async ({ request }: { request: Request }) => {
        const { auth } = await import("@/shared/auth/index.server");
        return await auth.handler(request);
      },
      POST: async ({ request }: { request: Request }) => {
        const { auth } = await import("@/shared/auth/index.server");
        return await auth.handler(request);
      },
    },
  },
});

export { Route };
