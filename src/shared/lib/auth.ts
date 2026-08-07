import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { getDb } from "../db/client/client";
import * as schema from "../db/schema";

export function getAuthConfig(
	env: Record<string, string | undefined> = process.env,
) {
	const baseURL = env.BETTER_AUTH_URL || "http://localhost:3000";
	const secret =
		env.BETTER_AUTH_SECRET || "development-secret-key-at-least-32-chars-long";

	return {
		baseURL,
		emailAndPassword: {
			enabled: true,
		},
		secret,
	};
}

export async function getAuth() {
	const db = await getDb();
	const config = getAuthConfig();

	return betterAuth({
		...config,
		database: drizzleAdapter(db, {
			provider: "sqlite",
			schema,
		}),
	});
}
