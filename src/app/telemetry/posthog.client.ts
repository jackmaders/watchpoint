// biome-ignore-all lint/style/useNamingConvention: PostHog SDK options

import "@tanstack/react-start/client-only";

import posthog from "posthog-js";

if (import.meta.env.VITE_POSTHOG_KEY) {
	posthog.init(import.meta.env.VITE_POSTHOG_KEY, {
		api_host: import.meta.env.VITE_POSTHOG_HOST,
		capture_exceptions: true,
	});
}
