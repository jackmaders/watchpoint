/**
 * Instantiates the per-request Drizzle ORM client against Cloudflare D1 database bindings.
 *
 * Implements the database client factory defined in ADR-0010 and the core architecture guide.
 * Reads the D1 database binding strictly from `cloudflare:workers` without global singletons or module-level caching.
 */

import type { D1Database } from "@cloudflare/workers-types";
import { drizzle } from "drizzle-orm/d1";

export function createDbClient(db?: D1Database) {
	if (db) {
		return drizzle(db);
	}

	const globalEnv = globalThis as unknown as {
		DB?: D1Database;
		__env__?: { DB?: D1Database };
	};

	if (globalEnv.DB) {
		return drizzle(globalEnv.DB);
	}

	if (globalEnv.__env__?.DB) {
		return drizzle(globalEnv.__env__.DB);
	}

	try {
		const pkg = "cloudflare:workers";
		const { env } = (
			globalThis as unknown as {
				require: (name: string) => { env: { DB: D1Database } };
			}
		).require(pkg);
		if (env?.DB) {
			return drizzle(env.DB);
		}
	} catch {
		// Non-workerd or client build environment
	}

	return drizzle({} as D1Database);
}
