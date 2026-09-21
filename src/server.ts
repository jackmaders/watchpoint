import * as Sentry from "@sentry/cloudflare";
import handler from "@tanstack/react-start/server-entry";

const worker = {
	async fetch(request: Request) {
		return handler.fetch(request);
	},
} satisfies ExportedHandler<Env>;

export default Sentry.withSentry(
	(env) => ({
		dsn: env.SENTRY_DSN,
		sendDefaultPii: true,
		enableLogs: true,
		tracesSampleRate: 1.0,
	}),
	worker,
);
