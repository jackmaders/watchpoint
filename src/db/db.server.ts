import "@tanstack/react-start/server-only";

// biome-ignore lint/correctness/noUnresolvedImports: Cloudflare Workers provides this runtime module.
import { env } from "cloudflare:workers";
import { drizzle } from "drizzle-orm/d1";

export function getDb(db = env.DB) {
	return drizzle(db);
}
