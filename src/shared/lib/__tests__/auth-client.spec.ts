/**
 * Unit test suite verifying the structure and exported interface of the browser-side Better Auth client.
 *
 * Asserts that `authClient` correctly exposes expected session lifecycle and authentication methods
 * required by consumer UI components.
 */

import { describe, expect, it } from "vitest";
import { authClient } from "../auth-client";

describe("auth client", () => {
	it("exposes the Better Auth session lifecycle methods", () => {
		// Arrange
		const client = authClient as typeof authClient & {
			signIn: { email: unknown };
			signOut: unknown;
			signUp: { email: unknown };
			useSession: unknown;
		};

		// Act
		const methods = [
			client.signIn.email,
			client.signOut,
			client.signUp.email,
			client.useSession,
		];

		// Assert
		expect(methods.every((method) => typeof method === "function")).toBe(true);
	});
});
