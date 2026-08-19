import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../db/client/client");
vi.mock("@tanstack/react-start/server");

import {
	createRegistrationHook,
	enforceRegistrationGate,
	getAuth,
	getAuthConfig,
	getCurrentUser,
} from "../auth";

describe("auth", () => {
	beforeEach(() => {
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

		// Act
		const configUndefined = getAuthConfig(emptyEnv);
		const configEmpty = getAuthConfig(blankEnv);

		// Assert
		expect(configUndefined.baseURL).toBe("http://localhost:3000");
		expect(configUndefined.secret).toBe(
			"development-secret-key-at-least-32-chars-long",
		);
		expect(configEmpty.baseURL).toBe("http://localhost:3000");
		expect(configEmpty.secret).toBe(
			"development-secret-key-at-least-32-chars-long",
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
		expect(config.registrationEnabled).toBe(true);
	});

	it("disables registration from the server-side gate", () => {
		// Arrange
		const env = { WATCHPOINT_REGISTRATION_ENABLED: "false" };

		// Act
		const config = getAuthConfig(env);

		// Assert
		expect(config.registrationEnabled).toBe(false);
	});

	it("rejects only the disabled registration endpoint", () => {
		// Arrange & Act
		const disabledRegistration = () =>
			enforceRegistrationGate("/sign-up/email", false);
		const unrelatedRequest = () =>
			enforceRegistrationGate("/sign-in/email", false);

		// Assert
		expect(disabledRegistration).toThrow(
			"Registration is currently unavailable",
		);
		expect(unrelatedRequest()).toBeUndefined();
	});

	it("runs the registration hook for enabled and disabled requests", async () => {
		// Arrange
		const disabledHook = createRegistrationHook(false);
		const enabledHook = createRegistrationHook(true);

		// Act
		const disabledRequest = disabledHook({ path: "/sign-up/email" });
		const enabledRequest = enabledHook({ path: "/sign-up/email" });

		// Assert
		await expect(disabledRequest).rejects.toThrow(
			"Registration is currently unavailable",
		);
		expect(await enabledRequest).toBeUndefined();
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
