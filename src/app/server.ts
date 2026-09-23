import { withSentry } from "@sentry/cloudflare";
import { wrapFetchWithSentry } from "@sentry/tanstackstart-react";
import handler from "@tanstack/react-start/server-entry";

export default withSentry(
	(env: Cloudflare.Env) => ({
		dsn: env.SENTRY_DSN,
		tracesSampleRate: 1.0,
	}),
	wrapFetchWithSentry({
		fetch(request) {
			return handler.fetch(request);
		},
	}),
);
