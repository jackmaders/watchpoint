import type { D1Database } from "@cloudflare/workers-types";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "../schema";

export type DrizzleDb = ReturnType<typeof drizzle<typeof schema>>;

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
	const globalEnv = globalThis as unknown as {
		DB?: D1Database;
		__env__?: { DB?: D1Database };
		db?: DrizzleDb;
	};

	if (globalEnv.db) return globalEnv.db;

	let d1Binding: D1Database | undefined =
		(context as { env?: { DB?: D1Database } })?.env?.DB ??
		(context as { DB?: D1Database })?.DB ??
		(context as { cloudflare?: { env?: { DB?: D1Database } } })?.cloudflare?.env
			?.DB ??
		globalEnv.DB ??
		globalEnv.__env__?.DB;

	if (!d1Binding) {
		try {
			const { getPlatformProxy } = await import("wrangler");
			const proxy = await getPlatformProxy<{ DB: D1Database }>();
			d1Binding = proxy.env.DB;
		} catch {
			// Proxy fallback failure is handled below
		}
	}

	if (!d1Binding) {
		throw new Error("Cloudflare D1 database binding (DB) not found");
	}

	const client = drizzle(d1Binding, { schema });

	if (process.env.NODE_ENV === "development") {
		globalEnv.db = client;
	}

	return client;
}
