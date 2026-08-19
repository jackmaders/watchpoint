import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { type DbContext, getDb } from "../db/client/client";
import * as schema from "../db/schema";

export function getAuthConfig(
	env: Record<string, string | undefined> = process.env,
) {
	const baseURL = env.BETTER_AUTH_URL || "http://localhost:3000";
	const secret =
		env.BETTER_AUTH_SECRET || "development-secret-key-at-least-32-chars-long";
	const registrationEnabled = env.WATCHPOINT_REGISTRATION_ENABLED !== "false";

	return {
		baseURL,
		emailAndPassword: {
			enabled: true,
		},
		registrationEnabled,
		secret,
	};
}

function createAuthInstance(
	db: Parameters<typeof drizzleAdapter>[0],
	config: ReturnType<typeof getAuthConfig>,
) {
	const { registrationEnabled: _registrationEnabled, ...authConfig } = config;
	return betterAuth({
		...authConfig,
		database: drizzleAdapter(db, {
			provider: "sqlite",
			schema,
		}),
		hooks: {
			before: createAuthMiddleware(
				createRegistrationHook(config.registrationEnabled),
			),
		},
	});
}

export function createRegistrationHook(registrationEnabled: boolean) {
	return async (ctx: { path: string }) => {
		enforceRegistrationGate(ctx.path, registrationEnabled);
	};
}

export function enforceRegistrationGate(
	path: string,
	registrationEnabled: boolean,
) {
	if (path === "/sign-up/email" && !registrationEnabled) {
		throw new APIError("FORBIDDEN", {
			message: "Registration is currently unavailable",
		});
	}
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
