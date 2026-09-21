import { env, waitUntil } from "cloudflare:workers";
import { wrapRequestHandler } from "@sentry/cloudflare";
import { createMiddleware } from "@tanstack/react-start";

export const sentryRequestMiddleware = createMiddleware({
	type: "request",
}).server(async ({ next, request }) => {
	return wrapRequestHandler(
		{
			options: {
				dsn: env.SENTRY_DSN,
				sendDefaultPii: true,
				enableLogs: true,
				tracesSampleRate: 1.0,
			},
			request,
			context: {
				waitUntil,
				passThroughOnException() {},
			},
		},
		async () => (await next()).response,
	);
});
