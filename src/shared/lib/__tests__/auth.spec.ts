import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../db/client/client");
vi.mock("@tanstack/react-start/server");

import { getAuth, getAuthConfig, getCurrentUser } from "../auth";

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
		expect(config.emailAndPassword.disableSignUp).toBe(true);
		expect(config.session).toEqual({
			expiresIn: 60 * 60 * 24 * 7,
			updateAge: 60 * 60 * 24,
		});
	});

	it("keeps sign-in available while the server registration gate is closed", () => {
		// Arrange
		const env = {
			BETTER_AUTH_ALLOW_REGISTRATION: "false",
			BETTER_AUTH_SECRET: "custom-secret-key-12345678901234567890",
			BETTER_AUTH_URL: "https://watchpoint.example.com",
		};

		// Act
		const config = getAuthConfig(env);

		// Assert
		expect(config.emailAndPassword).toEqual({
			disableSignUp: true,
			enabled: true,
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
		expect(config.emailAndPassword.disableSignUp).toBe(false);
	});

	it("resolves authenticated user ID when session exists with passed Headers", async () => {
		// Arrange
		const auth = await getAuth();
		const mockHeaders = new Headers();
		vi.spyOn(auth.api, "getSession").mockResolvedValueOnce({
			session: { id: "sess_1" },
			user: { id: "usr_123" },
		} as never);

		// Act
		const user = await getCurrentUser(mockHeaders);

		// Assert
		expect(user).toEqual({ id: "usr_123" });
	});

	it("resolves authenticated user ID when record headers are passed", async () => {
		// Arrange
		const auth = await getAuth();
		vi.spyOn(auth.api, "getSession").mockResolvedValueOnce({
			session: { id: "sess_1" },
			user: { id: "usr_456" },
		} as never);

		// Act
		const user = await getCurrentUser({ cookie: "auth_token=xyz" });

		// Assert
		expect(user).toEqual({ id: "usr_456" });
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
		expect(user).toEqual({ id: "usr_789" });
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
});
