import { withSentry } from "@sentry/cloudflare";
import { wrapFetchWithSentry } from "@sentry/tanstackstart-react";
import handler from "@tanstack/react-start/server-entry";

export default withSentry(
	(env) => ({ dsn: env.SENTRY_DSN }),
	wrapFetchWithSentry({ fetch: (request) => handler.fetch(request) }),
);
