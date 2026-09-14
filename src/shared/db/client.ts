/**
 * Instantiates the per-request Drizzle ORM client against Cloudflare D1 database bindings.
 *
 * Implements the database client factory defined in ADR-0010 and the core architecture guide.
 * Reads the D1 database binding strictly from `cloudflare:workers` without global singletons or module-level caching.
 */

import type { D1Database } from "@cloudflare/workers-types";
import { drizzle } from "drizzle-orm/d1";

let localProxyPromise: Promise<{ env: { DB: D1Database } }> | null = null;

async function getLocalDb(): Promise<D1Database> {
	if (!localProxyPromise) {
		localProxyPromise = (async () => {
			const modName = "wrangler";
			const { getPlatformProxy } = (await import(
				/* @vite-ignore */ `${modName}`
			)) as typeof import("wrangler");
			return getPlatformProxy<{ DB: D1Database }>();
		})();
	}
	const proxy = await localProxyPromise;
	return proxy.env.DB;
}

export function getLazyLocalDbProxy(): D1Database {
	return {
		async batch<T = unknown>(statements: D1PreparedStatement[]) {
			const db = await getLocalDb();
			return db.batch<T>(statements);
		},
		async dump() {
			const db = await getLocalDb();
			return db.dump();
		},
		async exec(query: string) {
			const db = await getLocalDb();
			return db.exec(query);
		},
		prepare(query: string) {
			let boundParams: unknown[] = [];
			const statement = {
				async all() {
					const db = await getLocalDb();
					return db
						.prepare(query)
						.bind(...boundParams)
						.all();
				},
				bind(...params: unknown[]) {
					boundParams = params;
					return statement;
				},
				async first<T = unknown>(colName?: string) {
					const db = await getLocalDb();
					return colName !== undefined
						? db
								.prepare(query)
								.bind(...boundParams)
								.first<T>(colName)
						: db
								.prepare(query)
								.bind(...boundParams)
								.first<T>();
				},
				async raw() {
					const db = await getLocalDb();
					return db
						.prepare(query)
						.bind(...boundParams)
						.raw();
				},
				async run() {
					const db = await getLocalDb();
					return db
						.prepare(query)
						.bind(...boundParams)
						.run();
				},
			};
			return statement as unknown as D1PreparedStatement;
		},
	} as unknown as D1Database;
}

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
		const req = (
			globalThis as unknown as {
				require?: (name: string) => { env?: { DB?: D1Database } };
			}
		).require;
		if (req) {
			const { env } = req(pkg);
			if (env?.DB) {
				return drizzle(env.DB);
			}
		}
	} catch {
		// Non-workerd environment
	}

	if (typeof window === "undefined" && process.env.NODE_ENV !== "production") {
		return drizzle(getLazyLocalDbProxy());
	}

	return drizzle({} as D1Database);
}
