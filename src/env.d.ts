import type { D1Database } from "@cloudflare/workers-types";
import type { PrismaClient } from "../generated/prisma/client";

declare global {
	var prisma: PrismaClient | undefined;

	namespace NodeJS {
		interface ProcessEnv {
			DATABASE_URL: string;
			BETTER_AUTH_SECRET: string;
			BETTER_AUTH_URL: string;
			NODE_ENV: "development" | "production" | "test";
			DB: D1Database;
		}
	}
}
