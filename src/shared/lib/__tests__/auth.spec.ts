import { headers } from "next/headers";
import { describe, expect, it, vi } from "vitest";

vi.mock("../../db/client/client");
vi.mock("next/headers");

import {
	GUEST_USER,
	GUEST_USER_ID,
	getAuth,
	getAuthConfig,
	getCurrentUser,
} from "../auth";

describe("auth", () => {
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
	});

	it("defines deterministic guest user constant details", () => {
		// Arrange
		const expectedId = "usr_guest_demo";
		const expectedUser = {
			email: "guest@watchpoint.gg",
			id: "usr_guest_demo",
			name: "Guest Cadet",
		};

		// Act
		const id = GUEST_USER_ID;
		const user = GUEST_USER;

		// Assert
		expect(id).toBe(expectedId);
		expect(user).toEqual(expectedUser);
	});

	it("resolves authenticated user ID when session exists", async () => {
		// Arrange
		const auth = await getAuth();
		const mockHeaders = new Headers();
		vi.mocked(headers).mockResolvedValue(mockHeaders as never);
		vi.spyOn(auth.api, "getSession").mockResolvedValueOnce({
			session: { id: "sess_1" },
			user: { id: "usr_123" },
		} as never);

		// Act
		const user = await getCurrentUser();

		// Assert
		expect(user).toEqual({ id: "usr_123" });
	});

	it("returns null when session has no user", async () => {
		// Arrange
		const auth = await getAuth();
		const mockHeaders = new Headers();
		vi.mocked(headers).mockResolvedValue(mockHeaders as never);
		vi.spyOn(auth.api, "getSession").mockResolvedValueOnce(null as never);

		// Act
		const user = await getCurrentUser();

		// Assert
		expect(user).toBeNull();
	});

	it("returns null when headers or getSession throws an error", async () => {
		// Arrange
		vi.mocked(headers).mockRejectedValueOnce(new Error("Headers unavailable"));

		// Act
		const user = await getCurrentUser();

		// Assert
		expect(user).toBeNull();
	});
});
