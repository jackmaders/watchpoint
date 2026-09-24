import "@tanstack/react-start/server-only";

import { env } from "cloudflare:workers";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { betterAuth } from "better-auth/minimal";
import { tanstackStartCookies } from "better-auth/tanstack-start";
import { account, session, user, verification } from "@/shared/db";
import { getDb } from "../db/db.server";

export const auth = betterAuth({
	baseURL: env.BETTER_AUTH_URL,
	database: drizzleAdapter(getDb(), {
		provider: "sqlite",
		schema: { account, session, user, verification },
		transaction: false,
	}),
	emailAndPassword: {
		enabled: true,
	},
	secret: env.BETTER_AUTH_SECRET,
	plugins: [tanstackStartCookies()],
});
