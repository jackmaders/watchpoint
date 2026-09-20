import "@tanstack/react-start/server-only";

import { env } from "cloudflare:workers";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { betterAuth } from "better-auth/minimal";
import { tanstackStartCookies } from "better-auth/tanstack-start";
import {
	account,
	getDb,
	session,
	user,
	verification,
} from "@/shared/db/index.server";

function requireAuthSecret(value: string | undefined) {
	const secret = value?.trim();
	if (!secret || secret.length < 32) {
		throw new Error(
			"BETTER_AUTH_SECRET must be set to a random value with at least 32 characters.",
		);
	}

	return secret;
}

function requireAuthUrl(value: string | undefined) {
	const configuredUrl = value?.trim();
	if (!configuredUrl) {
		throw new Error(
			"BETTER_AUTH_URL must be set to the origin serving the application.",
		);
	}

	let url: URL;
	try {
		url = new URL(configuredUrl);
	} catch {
		throw new Error("BETTER_AUTH_URL must be a valid HTTP(S) URL.");
	}

	if (
		(url.protocol !== "http:" && url.protocol !== "https:") ||
		url.pathname !== "/" ||
		url.search ||
		url.hash
	) {
		throw new Error(
			"BETTER_AUTH_URL must be an HTTP(S) origin without a path, query, or hash.",
		);
	}

	return url.origin;
}

const authSecret = requireAuthSecret(env.BETTER_AUTH_SECRET);
const authUrl = requireAuthUrl(env.BETTER_AUTH_URL);

export const auth = betterAuth({
	baseURL: authUrl,
	database: drizzleAdapter(getDb(), {
		provider: "sqlite",
		schema: { account, session, user, verification },
		transaction: false,
	}),
	emailAndPassword: {
		enabled: true,
	},
	secret: authSecret,
	trustedOrigins: [authUrl],
	// Keep this plugin last so it can attach Better Auth cookies to Start responses.
	plugins: [tanstackStartCookies()],
});
