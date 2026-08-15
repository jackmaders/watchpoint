import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { type DbContext, getDb } from "../db/client/client";
import * as schema from "../db/schema";

export const GUEST_USER_ID = "usr_guest_demo";

export const GUEST_USER = {
	email: "guest@watchpoint.gg",
	id: GUEST_USER_ID,
	name: "Guest Cadet",
} as const;

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

function createAuthInstance(
	db: Parameters<typeof drizzleAdapter>[0],
	config: ReturnType<typeof getAuthConfig>,
) {
	return betterAuth({
		...config,
		database: drizzleAdapter(db, {
			provider: "sqlite",
			schema,
		}),
	});
}

type AuthInstance = ReturnType<typeof createAuthInstance>;
let authInstance: AuthInstance | undefined;

export async function getAuth(context?: DbContext): Promise<AuthInstance> {
	if (authInstance) return authInstance;
	const db = await getDb(context);
	const config = getAuthConfig();

	authInstance = createAuthInstance(db, config);
	return authInstance;
}

export async function getCurrentUser(
	reqHeaders?: Headers | Record<string, string> | null,
	context?: DbContext,
): Promise<{ id: string } | null> {
	try {
		const auth = await getAuth(context);
		let headers: Headers | undefined;
		if (reqHeaders instanceof Headers) {
			headers = reqHeaders;
		} else if (reqHeaders) {
			headers = new Headers(reqHeaders);
		} else {
			try {
				const { getRequestHeaders } = await import(
					"@tanstack/react-start/server"
				);
				headers = getRequestHeaders();
			} catch {
				// not in server request context
			}
		}

		if (!headers) {
			return null;
		}

		const session = await auth.api.getSession({
			headers,
		});
		if (session?.user?.id) {
			return { id: session.user.id };
		}
		return null;
	} catch {
		return null;
	}
}
