import "@tanstack/react-start/client-only";

import { init } from "@sentry/tanstackstart-react";

init({
	dsn: import.meta.env.VITE_SENTRY_DSN,
	integrations: [],
	tracesSampleRate: 1.0,
	replaysSessionSampleRate: 0.1,
	replaysOnErrorSampleRate: 1.0,
});
