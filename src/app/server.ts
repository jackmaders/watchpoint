import handler from "@tanstack/react-start/server-entry";
import { PostHog } from "posthog-node";

export default {
	async fetch(request: Request, env: Cloudflare.Env, ctx: ExecutionContext) {
		try {
			return await handler.fetch(request);
		} catch (error) {
			if (env.POSTHOG_KEY) {
				const client = new PostHog(env.POSTHOG_KEY, {
					host: env.POSTHOG_HOST || "https://us.i.posthog.com",
					flushAt: 1,
					flushInterval: 0,
				});
				client.captureException(error, "server", {
					url: request.url,
					method: request.method,
				});
				ctx.waitUntil(client.shutdown());
			}
			throw error;
		}
	},
};
