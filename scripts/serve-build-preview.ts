import { existsSync } from "node:fs";
import { join } from "node:path";
import { getPlatformProxy } from "wrangler";
import server from "../dist/server/server.js";

const port = Number(process.env.PORT ?? 3000);
const host = process.env.HOST ?? "127.0.0.1";

const proxy = await getPlatformProxy<{ DB: unknown; MEDIA: unknown }>();

// Attach bindings to global scope for local database client
(
	globalThis as unknown as {
		__env__: typeof proxy.env;
		DB: typeof proxy.env.DB;
	}
).__env__ = proxy.env;
(globalThis as unknown as { DB: typeof proxy.env.DB }).DB = proxy.env.DB;

const clientDist = join(process.cwd(), "dist/client");

const bunServer = Bun.serve({
	async fetch(request) {
		const url = new URL(request.url);

		// 1. Serve static client assets from dist/client
		if (url.pathname !== "/") {
			const staticFilePath = join(clientDist, url.pathname);
			if (existsSync(staticFilePath)) {
				const file = Bun.file(staticFilePath);
				return new Response(file);
			}
		}

		// 2. Delegate SSR routes to compiled server bundle
		return server.fetch(request, {
			ctx: {
				passThroughOnException: () => {},
				waitUntil: (promise: Promise<unknown>) => {
					void promise;
				},
			},
			env: proxy.env,
		});
	},
	hostname: host,
	port,
});

console.log(`Serving build preview on ${bunServer.url}`);
