import { APIError, betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { count } from "drizzle-orm";
import { type DbContext, getDb } from "../db/client/client";
import * as schema from "../db/schema";

type SelectableDb = {
	select: (fields: unknown) => {
		from: (table: unknown) => Promise<Array<{ value: number }>>;
	};
};

export function getAuthConfig(
	env: Record<string, string | undefined> = process.env,
) {
	const baseURL = env.BETTER_AUTH_URL;
	const secret = env.BETTER_AUTH_SECRET;
	const allowRegistration = env.BETTER_AUTH_ALLOW_REGISTRATION === "true";

	if (!baseURL) {
		throw new Error("BETTER_AUTH_URL must be configured");
	}
	if (!secret) {
		throw new Error("BETTER_AUTH_SECRET must be configured");
	}

	return {
		allowRegistration,
		baseURL,
		emailAndPassword: {
			disableSignUp: false,
			enabled: true,
		},
		secret,
		session: {
			expiresIn: 60 * 60 * 24 * 7,
			updateAge: 60 * 60 * 24,
		},
	};
}

export function createAuthInstance(
	db: Parameters<typeof drizzleAdapter>[0],
	config: ReturnType<typeof getAuthConfig>,
) {
	return betterAuth({
		baseURL: config.baseURL,
		database: drizzleAdapter(db, {
			provider: "sqlite",
			schema: {
				account: schema.accounts,
				session: schema.sessions,
				user: schema.users,
				verification: schema.verifications,
			},
		}),
		databaseHooks: {
			user: {
				create: {
					before: async (user) => {
						const [{ value: userCount }] = await (db as unknown as SelectableDb)
							.select({ value: count() })
							.from(schema.users);
						if (userCount === 0) {
							return {
								data: {
									...user,
									role: "ADMIN",
								},
							};
						}
						if (!config.allowRegistration) {
							throw new APIError("FORBIDDEN", {
								message: "Registration is currently closed.",
							});
						}
						return {
							data: {
								...user,
								role: "PLAYER",
							},
						};
					},
				},
			},
		},
		emailAndPassword: config.emailAndPassword,
		secret: config.secret,
		session: config.session,
		user: {
			additionalFields: {
				role: {
					defaultValue: "PLAYER",
					input: false,
					type: "string",
				},
			},
		},
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

export interface CurrentUser {
	email?: string;
	id: string;
	name?: string;
	role?: schema.UserRole;
}

async function resolveRequestHeaders(
	reqHeaders?: Headers | Record<string, string> | null,
): Promise<Headers | undefined> {
	if (reqHeaders instanceof Headers) {
		return reqHeaders;
	}
	if (reqHeaders) {
		return new Headers(reqHeaders);
	}
	try {
		const { getRequestHeaders } = await import("@tanstack/react-start/server");
		return getRequestHeaders();
	} catch {
		return undefined;
	}
}

export async function getCurrentUser(
	reqHeaders?: Headers | Record<string, string> | null,
	context?: DbContext,
): Promise<CurrentUser | null> {
	try {
		const auth = await getAuth(context);
		const headers = await resolveRequestHeaders(reqHeaders);

		if (!headers) {
			return null;
		}

		const session = await auth.api.getSession({
			headers,
		});
		if (session?.user?.id) {
			const role =
				(session.user as { role?: schema.UserRole }).role ?? "PLAYER";
			return {
				email: session.user.email ?? undefined,
				id: session.user.id,
				name: session.user.name ?? undefined,
				role,
			};
		}
		return null;
	} catch {
		return null;
	}
}

export async function isRegistrationOpen(
	context?: DbContext,
	env: Record<string, string | undefined> = process.env,
): Promise<boolean> {
	if (env.BETTER_AUTH_ALLOW_REGISTRATION === "true") {
		return true;
	}
	const db = await getDb(context);
	const [{ value: userCount }] = await (db as unknown as SelectableDb)
		.select({ value: count() })
		.from(schema.users);
	return userCount === 0;
}
