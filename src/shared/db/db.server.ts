import "@tanstack/react-start/server-only";

import { env } from "cloudflare:workers";
import { drizzle } from "drizzle-orm/d1";

export function getDb(db = env.DB) {
	return drizzle(db);
}
