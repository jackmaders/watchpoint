import { describe, expect, it, vi } from "vitest";

vi.mock("../db/client/client");

import { getAuth, getAuthConfig } from "./auth";

describe("auth", () => {
	it("initializes better-auth instance correctly", async () => {
		const auth = await getAuth();
		expect(auth).toBeDefined();
		expect(auth.handler).toBeInstanceOf(Function);
	});

	it("resolves config with defaults when environment variables are missing or empty", () => {
		const configUndefined = getAuthConfig({});
		expect(configUndefined.baseURL).toBe("http://localhost:3000");
		expect(configUndefined.secret).toBe(
			"development-secret-key-at-least-32-chars-long",
		);

		const configEmpty = getAuthConfig({
			BETTER_AUTH_SECRET: "",
			BETTER_AUTH_URL: "",
		});
		expect(configEmpty.baseURL).toBe("http://localhost:3000");
		expect(configEmpty.secret).toBe(
			"development-secret-key-at-least-32-chars-long",
		);
	});

	it("resolves config with provided environment variables", () => {
		const config = getAuthConfig({
			BETTER_AUTH_SECRET: "custom-secret-key-12345678901234567890",
			BETTER_AUTH_URL: "https://watchpoint.example.com",
		});
		expect(config.baseURL).toBe("https://watchpoint.example.com");
		expect(config.secret).toBe("custom-secret-key-12345678901234567890");
	});
});
