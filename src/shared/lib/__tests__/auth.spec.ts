import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../db/client/client");
vi.mock("@tanstack/react-start/server");

import { getDb } from "../../db/client/client";
import {
	createAuthInstance,
	getAuth,
	getAuthConfig,
	getCurrentUser,
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

	it("resolves authenticated user ID and role when session exists with passed Headers", async () => {
		// Arrange
		const auth = await getAuth();
		const mockHeaders = new Headers();
		vi.spyOn(auth.api, "getSession").mockResolvedValueOnce({
			session: { id: "sess_1" },
			user: {
				email: "user@example.com",
				id: "usr_123",
				name: "Test User",
				role: "ADMIN",
			},
		} as never);

		// Act
		const user = await getCurrentUser(mockHeaders);

		// Assert
		expect(user).toEqual({
			email: "user@example.com",
			id: "usr_123",
			name: "Test User",
			role: "ADMIN",
		});
	});

	it("resolves authenticated user with default role when role is absent", async () => {
		// Arrange
		const auth = await getAuth();
		vi.spyOn(auth.api, "getSession").mockResolvedValueOnce({
			session: { id: "sess_1" },
			user: {
				id: "usr_456",
			},
		} as never);

		// Act
		const user = await getCurrentUser({ cookie: "auth_token=xyz" });

		// Assert
		expect(user).toEqual({
			email: undefined,
			id: "usr_456",
			name: undefined,
			role: "PLAYER",
		});
	});

	it("resolves user ID from getRequestHeaders when headers param is omitted", async () => {
		// Arrange
		const auth = await getAuth();
		const { getRequestHeaders } = await import("@tanstack/react-start/server");
		vi.mocked(getRequestHeaders).mockReturnValueOnce(
			new Headers({ cookie: "session=123" }),
		);
		vi.spyOn(auth.api, "getSession").mockResolvedValueOnce({
			session: { id: "sess_1" },
			user: { id: "usr_789" },
		} as never);

		// Act
		const user = await getCurrentUser();

		// Assert
		expect(user).toEqual({
			email: undefined,
			id: "usr_789",
			name: undefined,
			role: "PLAYER",
		});
	});

	it("returns null when session has no user", async () => {
		// Arrange
		const auth = await getAuth();
		const mockHeaders = new Headers();
		vi.spyOn(auth.api, "getSession").mockResolvedValueOnce(null as never);

		// Act
		const user = await getCurrentUser(mockHeaders);

		// Assert
		expect(user).toBeNull();
	});

	it("treats an expired session as anonymous", async () => {
		// Arrange
		const auth = await getAuth();
		vi.spyOn(auth.api, "getSession").mockResolvedValueOnce(null as never);

		// Act
		const user = await getCurrentUser(new Headers());

		// Assert
		expect(user).toBeNull();
	});

	it("returns null when no headers can be resolved", async () => {
		// Arrange
		const { getRequestHeaders } = await import("@tanstack/react-start/server");
		vi.mocked(getRequestHeaders).mockImplementationOnce(() => {
			throw new Error("No request context");
		});

		// Act
		const user = await getCurrentUser();

		// Assert
		expect(user).toBeNull();
	});

	it("returns null when getSession throws an error", async () => {
		// Arrange
		const auth = await getAuth();
		const mockHeaders = new Headers();
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
		const mockDb = {
			select: vi.fn().mockReturnValue({
				from: vi.fn().mockResolvedValue([{ value: 0 }]),
			}),
		};
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
		const mockDb = {
			select: vi.fn().mockReturnValue({
				from: vi.fn().mockResolvedValue([{ value: 3 }]),
			}),
		};
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
		const mockDb = {
			select: vi.fn().mockReturnValue({
				from: vi.fn().mockResolvedValue([{ value: 1 }]),
			}),
		};
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
		const open = await isRegistrationOpen(undefined, env);

		// Assert
		expect(open).toBe(true);
	});

	it("isRegistrationOpen returns true when user table is empty and env is false", async () => {
		// Arrange
		const mockDb = {
			select: vi.fn().mockReturnValue({
				from: vi.fn().mockResolvedValue([{ value: 0 }]),
			}),
		};
		vi.mocked(getDb).mockResolvedValueOnce(mockDb as never);
		const env = { BETTER_AUTH_ALLOW_REGISTRATION: "false" };

		// Act
		const open = await isRegistrationOpen(undefined, env);

		// Assert
		expect(open).toBe(true);
	});

	it("isRegistrationOpen returns false when user table has users and env is false", async () => {
		// Arrange
		const mockDb = {
			select: vi.fn().mockReturnValue({
				from: vi.fn().mockResolvedValue([{ value: 2 }]),
			}),
		};
		vi.mocked(getDb).mockResolvedValueOnce(mockDb as never);
		const env = { BETTER_AUTH_ALLOW_REGISTRATION: "false" };

		// Act
		const open = await isRegistrationOpen(undefined, env);

		// Assert
		expect(open).toBe(false);
	});
});
