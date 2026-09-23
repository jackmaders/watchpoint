import "@tanstack/react-start/server-only";

import { env } from "cloudflare:workers";
import { init, wrapFetchWithSentry } from "@sentry/tanstackstart-react";
import handler, { createServerEntry } from "@tanstack/react-start/server-entry";

init({ dsn: env.SENTRY_DSN });

export default createServerEntry(
	wrapFetchWithSentry({
		fetch: (request) => handler.fetch(request),
	}),
);
