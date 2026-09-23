import "./telemetry/sentry.client";

import {
	addIntegration,
	tanstackRouterBrowserTracingIntegration,
} from "@sentry/tanstackstart-react";
import { StartClient } from "@tanstack/react-start/client";
import { StrictMode, startTransition } from "react";
import { hydrateRoot } from "react-dom/client";
import { getRouter } from "./router";

const router = getRouter();
addIntegration(tanstackRouterBrowserTracingIntegration(router));

startTransition(() => {
	hydrateRoot(
		document,
		<StrictMode>
			<StartClient />
		</StrictMode>,
	);
});
