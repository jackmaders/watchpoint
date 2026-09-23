import "@tanstack/react-start/client-only";

import { init } from "@sentry/tanstackstart-react";

init({ dsn: import.meta.env.VITE_SENTRY_DSN });
