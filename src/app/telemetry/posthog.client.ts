// biome-ignore-all lint/style/useNamingConvention: PostHog SDK options

import "@tanstack/react-start/client-only";

const posthogKey = import.meta.env.VITE_POSTHOG_KEY;

if (posthogKey) {
	void import("posthog-js").then(({ default: posthog }) => {
		posthog.init(posthogKey, {
			api_host: import.meta.env.VITE_POSTHOG_HOST,
			capture_exceptions: true,
		});
	});
}
