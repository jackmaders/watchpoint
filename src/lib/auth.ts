import "@tanstack/react-start/server-only";

// biome-ignore lint/correctness/noUnresolvedImports: Cloudflare Workers provides this runtime module.
import { env } from "cloudflare:workers";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { betterAuth } from "better-auth/minimal";
import { tanstackStartCookies } from "better-auth/tanstack-start";
import { account, session, user, verification } from "@/db/auth-schema";
import { getDb } from "@/db/db.server";

type AuthRuntimeEnv = Cloudflare.Env & {
	BETTER_AUTH_SECRET?: string;
	BETTER_AUTH_URL?: string;
};

const authEnv = env as AuthRuntimeEnv;

export const auth = betterAuth({
	baseURL: authEnv.BETTER_AUTH_URL,
	database: drizzleAdapter(getDb(), {
		provider: "sqlite",
		schema: { account, session, user, verification },
		transaction: false,
	}),
	emailAndPassword: {
		enabled: true,
	},
	secret: authEnv.BETTER_AUTH_SECRET,
	trustedOrigins: authEnv.BETTER_AUTH_URL
		? [authEnv.BETTER_AUTH_URL]
		: undefined,
	// Keep this plugin last so it can attach Better Auth cookies to Start responses.
	plugins: [tanstackStartCookies()],
});
