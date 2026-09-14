/**
 * Unit test suite verifying server-side Better Auth lifecycle, user resolution, and registration governance.
 *
 * Tests `getAuthConfig`, `createAuthInstance`, `getAuth`, `getCurrentUser`, and `isRegistrationOpen` using
 * Vitest mocks for database queries and request headers across edge and local runtime scenarios.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../db");
vi.mock("@tanstack/react-start/server");

import { getRequestHeaders } from "@tanstack/react-start/server";
import { queryUsers } from "../../db";
import {
	createAuthInstance,
	getAuth,
	getAuthConfig,
	getCurrentUser,
	handleAuthRequest,
	isRegistrationOpen,
} from "../auth";

describe("auth", () => {
	beforeEach(() => {
		vi.stubEnv("BETTER_AUTH_URL", "http://localhost:3000");
		vi.stubEnv(
			"BETTER_AUTH_SECRET",
			"test-secret-key-123456789012345678901234",
		);
		vi.clearAllMocks();
	});

	it("initializes better-auth instance correctly", async () => {
		// Arrange & Act
		const auth = await getAuth();

		// Assert
		expect(auth).toBeDefined();
		expect(auth.handler).toBeInstanceOf(Function);
	});

	it("resolves config with defaults when environment variables are missing or empty", () => {
		// Arrange
		const emptyEnv = {};
		const blankEnv = {
			BETTER_AUTH_SECRET: "",
			BETTER_AUTH_URL: "",
		};

		// Assert
		expect(() => getAuthConfig(emptyEnv)).toThrow(
			"BETTER_AUTH_URL must be configured",
		);
		expect(() => getAuthConfig(blankEnv)).toThrow(
			"BETTER_AUTH_URL must be configured",
		);
	});

	it("resolves config with provided environment variables", () => {
		// Arrange
		const customEnv = {
			BETTER_AUTH_SECRET: "custom-secret-key-12345678901234567890",
			BETTER_AUTH_URL: "https://watchpoint.example.com",
		};

		// Act
		const config = getAuthConfig(customEnv);

		// Assert
		expect(config.baseURL).toBe("https://watchpoint.example.com");
		expect(config.secret).toBe("custom-secret-key-12345678901234567890");
		expect(config.allowRegistration).toBe(false);
		expect(config.session).toEqual({
			expiresIn: 60 * 60 * 24 * 7,
			updateAge: 60 * 60 * 24,
		});
	});

	it("requires the auth secret even when the base URL is configured", () => {
		// Arrange
		const env = { BETTER_AUTH_URL: "https://watchpoint.example.com" };

		// Act & Assert
		expect(() => getAuthConfig(env)).toThrow(
			"BETTER_AUTH_SECRET must be configured",
		);
	});

	it("enables registration only from the server environment", () => {
		// Arrange
		const env = {
			BETTER_AUTH_ALLOW_REGISTRATION: "true",
			BETTER_AUTH_SECRET: "custom-secret-key-12345678901234567890",
			BETTER_AUTH_URL: "https://watchpoint.example.com",
		};

		// Act
		const config = getAuthConfig(env);

		// Assert
		expect(config.allowRegistration).toBe(true);
	});

	it("resolves null user when headers are not available and react-start fails", async () => {
		// Arrange & Act
		const user = await getCurrentUser(null);

		// Assert
		expect(user).toBeNull();
	});

	it("resolves null user when getRequestHeaders throws an error", async () => {
		// Arrange
		vi.mocked(getRequestHeaders).mockImplementationOnce(() => {
			throw new Error("Out of request context");
		});

		// Act
		const user = await getCurrentUser();

		// Assert
		expect(user).toBeNull();
	});

	it("resolves authenticated user payload when valid session is returned", async () => {
		// Arrange
		const auth = await getAuth();
		const mockHeaders = new Headers({ cookie: "session=123" });
		vi.spyOn(auth.api, "getSession").mockResolvedValueOnce({
			session: {
				createdAt: new Date(),
				expiresAt: new Date(),
				id: "sess_123",
				token: "tok_123",
				updatedAt: new Date(),
				userId: "usr_123",
			},
			user: {
				createdAt: new Date(),
				email: "player@example.com",
				emailVerified: true,
				id: "usr_123",
				name: "Player 1",
				role: "ADMIN",
				updatedAt: new Date(),
			},
		} as never);

		// Act
		const user = await getCurrentUser(mockHeaders);

		// Assert
		expect(user).toEqual({
			email: "player@example.com",
			id: "usr_123",
			name: "Player 1",
			role: "ADMIN",
		});
	});

	it("resolves user from Record<string, string> request headers", async () => {
		// Arrange
		const auth = await getAuth();
		const mockHeaders = { cookie: "session=123" };
		vi.spyOn(auth.api, "getSession").mockResolvedValueOnce({
			session: {
				createdAt: new Date(),
				expiresAt: new Date(),
				id: "sess_123",
				token: "tok_123",
				updatedAt: new Date(),
				userId: "usr_123",
			},
			user: {
				createdAt: new Date(),
				email: "player@example.com",
				emailVerified: true,
				id: "usr_123",
				name: "Player 1",
				role: "PLAYER",
				updatedAt: new Date(),
			},
		} as never);

		// Act
		const user = await getCurrentUser(mockHeaders);

		// Assert
		expect(user).toEqual({
			email: "player@example.com",
			id: "usr_123",
			name: "Player 1",
			role: "PLAYER",
		});
	});

	it("defaults user role to PLAYER when session role is not specified", async () => {
		// Arrange
		const auth = await getAuth();
		const mockHeaders = new Headers({ cookie: "session=123" });
		vi.spyOn(auth.api, "getSession").mockResolvedValueOnce({
			session: {
				createdAt: new Date(),
				expiresAt: new Date(),
				id: "sess_123",
				token: "tok_123",
				updatedAt: new Date(),
				userId: "usr_123",
			},
			user: {
				createdAt: new Date(),
				emailVerified: true,
				id: "usr_123",
				updatedAt: new Date(),
			},
		} as never);

		// Act
		const user = await getCurrentUser(mockHeaders);

		// Assert
		expect(user).toEqual({
			email: undefined,
			id: "usr_123",
			name: undefined,
			role: "PLAYER",
		});
	});

	it("resolves null when session does not contain user ID", async () => {
		// Arrange
		const auth = await getAuth();
		const mockHeaders = new Headers({ cookie: "session=invalid" });
		vi.spyOn(auth.api, "getSession").mockResolvedValueOnce(null as never);

		// Act
		const user = await getCurrentUser(mockHeaders);

		// Assert
		expect(user).toBeNull();
	});

	it("returns null when getSession throws an error", async () => {
		// Arrange
		const auth = await getAuth();
		const mockHeaders = new Headers({ cookie: "session=err" });
		vi.spyOn(auth.api, "getSession").mockRejectedValueOnce(
			new Error("Auth failed"),
		);

		// Act
		const user = await getCurrentUser(mockHeaders);

		// Assert
		expect(user).toBeNull();
	});

	it("databaseHooks grants ADMIN to the first user registered", async () => {
		// Arrange
		vi.mocked(queryUsers).mockResolvedValueOnce([]);
		const mockDb = {};
		const config = {
			allowRegistration: false,
			baseURL: "http://localhost:3000",
			emailAndPassword: { disableSignUp: false, enabled: true },
			secret: "test-secret-key-123456789012345678901234",
			session: { expiresIn: 1000, updateAge: 100 },
		};
		type AuthOptionsWithHook = {
			databaseHooks?: {
				user?: {
					create?: {
						before?: (user: {
							email: string;
							name: string;
						}) => Promise<unknown>;
					};
				};
			};
		};

		// Act
		const instance = createAuthInstance(mockDb as never, config);
		const hook = (instance.options as unknown as AuthOptionsWithHook)
			.databaseHooks?.user?.create?.before;
		const result = await hook?.({ email: "first@example.com", name: "First" });

		// Assert
		expect(result).toEqual({
			data: {
				email: "first@example.com",
				name: "First",
				role: "ADMIN",
			},
		});
	});

	it("databaseHooks grants PLAYER to subsequent user when registration is open", async () => {
		// Arrange
		vi.mocked(queryUsers).mockResolvedValueOnce([{ id: "u-1" } as never]);
		const mockDb = {};
		const config = {
			allowRegistration: true,
			baseURL: "http://localhost:3000",
			emailAndPassword: { disableSignUp: false, enabled: true },
			secret: "test-secret-key-123456789012345678901234",
			session: { expiresIn: 1000, updateAge: 100 },
		};
		type AuthOptionsWithHook = {
			databaseHooks?: {
				user?: {
					create?: {
						before?: (user: {
							email: string;
							name: string;
						}) => Promise<unknown>;
					};
				};
			};
		};

		// Act
		const instance = createAuthInstance(mockDb as never, config);
		const hook = (instance.options as unknown as AuthOptionsWithHook)
			.databaseHooks?.user?.create?.before;
		const result = await hook?.({
			email: "player@example.com",
			name: "Player",
		});

		// Assert
		expect(result).toEqual({
			data: {
				email: "player@example.com",
				name: "Player",
				role: "PLAYER",
			},
		});
	});

	it("databaseHooks throws FORBIDDEN for subsequent user when registration is closed", async () => {
		// Arrange
		vi.mocked(queryUsers).mockResolvedValueOnce([{ id: "u-1" } as never]);
		const mockDb = {};
		const config = {
			allowRegistration: false,
			baseURL: "http://localhost:3000",
			emailAndPassword: { disableSignUp: false, enabled: true },
			secret: "test-secret-key-123456789012345678901234",
			session: { expiresIn: 1000, updateAge: 100 },
		};
		type AuthOptionsWithHook = {
			databaseHooks?: {
				user?: {
					create?: {
						before?: (user: {
							email: string;
							name: string;
						}) => Promise<unknown>;
					};
				};
			};
		};

		// Act
		const instance = createAuthInstance(mockDb as never, config);
		const hook = (instance.options as unknown as AuthOptionsWithHook)
			.databaseHooks?.user?.create?.before;

		// Assert
		await expect(
			hook?.({ email: "player@example.com", name: "Player" }),
		).rejects.toThrow("Registration is currently closed.");
	});

	it("isRegistrationOpen returns true when BETTER_AUTH_ALLOW_REGISTRATION is true", async () => {
		// Arrange
		const env = { BETTER_AUTH_ALLOW_REGISTRATION: "true" };

		// Act
		const open = await isRegistrationOpen(env);

		// Assert
		expect(open).toBe(true);
	});

	it("isRegistrationOpen returns true when user table is empty and env is false", async () => {
		// Arrange
		vi.mocked(queryUsers).mockResolvedValueOnce([]);
		const env = { BETTER_AUTH_ALLOW_REGISTRATION: "false" };

		// Act
		const open = await isRegistrationOpen(env);

		// Assert
		expect(open).toBe(true);
	});

	it("isRegistrationOpen returns false when user table has users and env is false", async () => {
		// Arrange
		vi.mocked(queryUsers).mockResolvedValueOnce([{ id: "usr_1" } as never]);
		const env = { BETTER_AUTH_ALLOW_REGISTRATION: "false" };

		// Act
		const open = await isRegistrationOpen(env);

		// Assert
		expect(open).toBe(false);
	});

	it("handleAuthRequest delegates request to auth instance handler", async () => {
		// Arrange
		const auth = await getAuth();
		const handlerSpy = vi
			.spyOn(auth, "handler")
			.mockResolvedValueOnce(new Response("ok"));
		const mockRequest = new Request("http://localhost:3000/api/auth/session");

		// Act
		const response = await handleAuthRequest({ request: mockRequest });

		// Assert
		expect(response).toBeDefined();
		expect(handlerSpy).toHaveBeenCalledWith(mockRequest);
	});
});
