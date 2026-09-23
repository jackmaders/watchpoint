import { StartClient } from "@tanstack/react-start/client";
import posthog from "posthog-js";
import { StrictMode, startTransition } from "react";
import { hydrateRoot } from "react-dom/client";

const posthogKey = import.meta.env.VITE_POSTHOG_KEY;
const posthogHost =
	import.meta.env.VITE_POSTHOG_HOST || "https://us.i.posthog.com";

if (posthogKey) {
	posthog.init(posthogKey, {
		// biome-ignore-start lint/style/useNamingConvention: PostHog SDK option
		api_host: posthogHost,
		capture_exceptions: true,
		person_profiles: "identified_only",
		// biome-ignore-end lint/style/useNamingConvention: PostHog SDK option
	});
}

startTransition(() => {
	hydrateRoot(
		document,
		<StrictMode>
			<StartClient />
		</StrictMode>,
	);
});
