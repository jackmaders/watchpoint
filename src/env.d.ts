import type { PrismaClient } from "../generated/prisma/client";

declare global {
	var prisma: PrismaClient | undefined;

	namespace NodeJS {
		interface ProcessEnv {
			BETTER_AUTH_SECRET: string;
			BETTER_AUTH_URL: string;
			NODE_ENV: "development" | "production" | "test";
		}
	}
}
