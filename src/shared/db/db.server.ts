import { env } from "cloudflare:workers";
import { drizzle } from "drizzle-orm/d1";

function getDb(db: D1Database = env.DB) {
  return drizzle(db);
}

type Database = ReturnType<typeof getDb>;

interface DbContext {
  db?: Database | undefined;
}

export { getDb, type Database, type DbContext };
