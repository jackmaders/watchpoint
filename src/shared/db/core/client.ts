/**
 * Resolves Cloudflare D1 database connections and instantiates the application-wide
 * Drizzle ORM instance across edge runtime, test runner, and development proxy environments.
 *
 * Implements the core database client factory for ADR-0010. Resolves `D1Database` bindings
 * dynamically from `DbContext` parameters, global runtime environments, or local Wrangler
 * platform proxies, caching instances in development and exposing the strongly-typed `DrizzleDb` client.
 */

import type { D1Database } from "@cloudflare/workers-types";
import { drizzle } from "drizzle-orm/d1";
import { relations } from "../schema/relations";

export type DrizzleDb = ReturnType<typeof drizzle<typeof relations>>;

export type DbContext =
	| {
			DB?: D1Database;
			cloudflare?: {
				env?: {
					DB?: D1Database;
				};
			};
			env?: {
				DB?: D1Database;
			};
	  }
	| Record<string, unknown>;

export async function getDb(context?: DbContext): Promise<DrizzleDb> {
	const explicitBinding: D1Database | undefined =
		(context as { env?: { DB?: D1Database } })?.env?.DB ??
		(context as { DB?: D1Database })?.DB ??
		(context as { cloudflare?: { env?: { DB?: D1Database } } })?.cloudflare?.env
			?.DB;

	if (explicitBinding) {
		return drizzle(explicitBinding, { relations });
	}

	const globalEnv = globalThis as unknown as {
		DB?: D1Database;
		__env__?: { DB?: D1Database };
		db?: DrizzleDb;
	};

	if (globalEnv.db) return globalEnv.db;

	let d1Binding: D1Database | undefined = globalEnv.DB ?? globalEnv.__env__?.DB;

	if (!d1Binding && process.env.NODE_ENV !== "production") {
		try {
			const pkg = "wrangler";
			const { getPlatformProxy } = (await import(
				/* @vite-ignore */ pkg
			)) as typeof import("wrangler");
			const proxy = await getPlatformProxy<{ DB: D1Database }>();
			d1Binding = proxy.env.DB;
		} catch {
			// Proxy fallback failure is handled below
		}
	}

	if (!d1Binding) {
		throw new Error("Cloudflare D1 database binding (DB) not found");
	}

	const client = drizzle(d1Binding, { relations });

	if (process.env.NODE_ENV === "development") {
		globalEnv.db = client;
	}

	return client;
}
