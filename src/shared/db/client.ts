/**
 * Instantiates the per-request Drizzle ORM client against Cloudflare D1 database bindings.
 *
 * Implements the database client factory defined in ADR-0010 and the core architecture guide.
 * Reads the D1 database binding strictly from `cloudflare:workers` without global singletons or module-level caching.
 */

import { env } from "cloudflare:workers";
import { drizzle } from "drizzle-orm/d1";

export function createDbClient() {
	return drizzle(env.DB);
}
