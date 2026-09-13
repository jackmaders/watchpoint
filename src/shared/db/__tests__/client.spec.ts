/**
 * Tests for createDbClient factory function.
 *
 * Verifies instantiating Drizzle D1 client per-request using the D1 binding.
 */

import type { D1Database } from "@cloudflare/workers-types";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createDbClient } from "../client";

describe("createDbClient", () => {
	const mockD1 = {} as D1Database;
	const originalGlobal = { ...globalThis };

	beforeEach(() => {
		delete (globalThis as Record<string, unknown>).DB;
		delete (globalThis as Record<string, unknown>).__env__;
		delete (globalThis as Record<string, unknown>).require;
	});

	afterEach(() => {
		(globalThis as Record<string, unknown>).DB = (
			originalGlobal as Record<string, unknown>
		).DB;
		(globalThis as Record<string, unknown>).__env__ = (
			originalGlobal as Record<string, unknown>
		).__env__;
	});

	it("returns a drizzle client instance with default fallback", () => {
		// Act
		const client = createDbClient();

		// Assert
		expect(client).toBeDefined();
		expect(typeof client.select).toBe("function");
	});

	it("returns drizzle client when explicit db parameter is provided", () => {
		// Act
		const client = createDbClient(mockD1);

		// Assert
		expect(client).toBeDefined();
		expect(typeof client.select).toBe("function");
	});

	it("returns drizzle client when globalThis.DB is present", () => {
		// Arrange
		(globalThis as Record<string, unknown>).DB = mockD1;

		// Act
		const client = createDbClient();

		// Assert
		expect(client).toBeDefined();
		expect(typeof client.select).toBe("function");
	});

	it("returns drizzle client when globalThis.__env__.DB is present", () => {
		// Arrange
		(globalThis as Record<string, unknown>).__env__ = { DB: mockD1 };

		// Act
		const client = createDbClient();

		// Assert
		expect(client).toBeDefined();
		expect(typeof client.select).toBe("function");
	});

	it("returns drizzle client when require('cloudflare:workers') succeeds", () => {
		// Arrange
		(globalThis as Record<string, unknown>).require = vi.fn((name: string) => {
			if (name === "cloudflare:workers") {
				return { env: { DB: mockD1 } };
			}
			throw new Error("Cannot find module");
		});

		// Act
		const client = createDbClient();

		// Assert
		expect(client).toBeDefined();
		expect(typeof client.select).toBe("function");
	});
});
