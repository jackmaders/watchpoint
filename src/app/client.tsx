import { StartClient } from "@tanstack/react-start/client";
import posthog from "posthog-js";
import { StrictMode, startTransition } from "react";
import { hydrateRoot } from "react-dom/client";

if (typeof window !== "undefined") {
	const posthogKey = import.meta.env.VITE_POSTHOG_KEY;
	const posthogHost =
		import.meta.env.VITE_POSTHOG_HOST || "https://us.i.posthog.com";

	if (posthogKey) {
		posthog.init(posthogKey, {
			// biome-ignore lint/style/useNamingConvention: PostHog SDK option
			api_host: posthogHost,
			// biome-ignore lint/style/useNamingConvention: PostHog SDK option
			capture_exceptions: true,
			// biome-ignore lint/style/useNamingConvention: PostHog SDK option
			person_profiles: "identified_only",
		});
	}
}

startTransition(() => {
	hydrateRoot(
		document,
		<StrictMode>
			<StartClient />
		</StrictMode>,
	);
});
