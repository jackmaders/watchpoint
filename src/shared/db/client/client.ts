import { getCloudflareContext } from "@opennextjs/cloudflare";
import { drizzle } from "drizzle-orm/d1";
import { cache } from "react";
import * as schema from "../schema";

export type DrizzleDb = ReturnType<typeof drizzle<typeof schema>>;

declare global {
	var db: DrizzleDb | undefined;
}

export const getDb = cache(async (): Promise<DrizzleDb> => {
	if (globalThis.db) return globalThis.db;
	const { env } = await getCloudflareContext({ async: true });
	const db = drizzle(env.DB, { schema });

	if (process.env.NODE_ENV !== "production") globalThis.db = db;

	return db;
});

export const getPrismaClient = getDb;
