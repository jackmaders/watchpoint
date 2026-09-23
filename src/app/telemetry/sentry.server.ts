import "@tanstack/react-start/server-only";

import { env } from "cloudflare:workers";
import { init } from "@sentry/tanstackstart-react";

init({ dsn: env.SENTRY_DSN });
