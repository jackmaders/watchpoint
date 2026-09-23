import "@tanstack/react-start/server-only";

import "./telemetry/sentry.server";

import { wrapFetchWithSentry } from "@sentry/tanstackstart-react";
import handler, { createServerEntry } from "@tanstack/react-start/server-entry";

export default createServerEntry(
	wrapFetchWithSentry({
		fetch: (request) => handler.fetch(request),
	}),
);
