/**
 * Tests for createDbClient factory function and local D1 proxy.
 *
 * Verifies instantiating Drizzle D1 client per-request using the D1 binding.
 */

import type { D1Database } from "@cloudflare/workers-types";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getPlatformProxy } from "wrangler";
import { createDbClient, getLazyLocalDbProxy } from "../client";

vi.mock("wrangler");

const mockPrepared = {
	all: vi.fn().mockResolvedValue({ results: [{ id: 1 }] }),
	bind: vi.fn().mockReturnThis(),
	first: vi.fn().mockResolvedValue({ id: 1 }),
	raw: vi.fn().mockResolvedValue([[1]]),
	run: vi.fn().mockResolvedValue({ success: true }),
};

const mockTargetDb = {
	batch: vi.fn().mockResolvedValue([{ results: [] }]),
	dump: vi.fn().mockResolvedValue(new ArrayBuffer(8)),
	exec: vi.fn().mockResolvedValue({ count: 1, duration: 1 }),
	prepare: vi.fn().mockReturnValue(mockPrepared),
} as unknown as D1Database;

beforeEach(() => {
	vi.mocked(getPlatformProxy).mockResolvedValue({
		env: { DB: mockTargetDb },
	} as never);
});

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

	it("falls through when require('cloudflare:workers') lacks DB property", () => {
		// Arrange
		(globalThis as Record<string, unknown>).require = vi.fn((name: string) => {
			if (name === "cloudflare:workers") {
				return { env: {} };
			}
			throw new Error("Cannot find module");
		});

		// Act
		const client = createDbClient();

		// Assert
		expect(client).toBeDefined();
		expect(typeof client.select).toBe("function");
	});

	it("returns lazy proxy client when window is undefined", () => {
		// Arrange
		const savedWindow = globalThis.window;
		// @ts-expect-error test override
		delete globalThis.window;

		// Act
		const client = createDbClient();

		// Assert
		expect(client).toBeDefined();
		expect(typeof client.select).toBe("function");

		globalThis.window = savedWindow;
	});

	it("returns fallback drizzle client when window is defined", () => {
		// Arrange
		(globalThis as Record<string, unknown>).window = {};

		// Act
		const client = createDbClient();

		// Assert
		expect(client).toBeDefined();
		expect(typeof client.select).toBe("function");

		delete (globalThis as Record<string, unknown>).window;
	});
});

describe("getLazyLocalDbProxy", () => {
	it("delegates prepare, bind, all, run, raw, first through lazy proxy", async () => {
		// Arrange
		const proxyDb = getLazyLocalDbProxy();
		const stmt = proxyDb.prepare("SELECT * FROM test").bind("arg1");

		// Act
		const allResult = await stmt.all();
		const runResult = await stmt.run();
		const rawResult = await stmt.raw();
		const firstResult = await stmt.first();
		const firstNamedResult = await stmt.first("id");

		// Assert
		expect(mockTargetDb.prepare).toHaveBeenCalledWith("SELECT * FROM test");
		expect(allResult).toEqual({ results: [{ id: 1 }] });
		expect(runResult).toEqual({ success: true });
		expect(rawResult).toEqual([[1]]);
		expect(firstResult).toEqual({ id: 1 });
		expect(firstNamedResult).toEqual({ id: 1 });
	});

	it("delegates batch, exec, and dump through lazy proxy", async () => {
		// Arrange
		const proxyDb = getLazyLocalDbProxy();

		// Act
		const batchResult = await proxyDb.batch([
			{ query: "INSERT INTO test VALUES (?)" } as never,
			{ params: [1], query: "INSERT INTO test VALUES (?)" } as never,
		]);
		const execResult = await proxyDb.exec("VACUUM;");
		const dumpResult = await proxyDb.dump();

		// Assert
		expect(batchResult).toEqual([{ results: [] }]);
		expect(execResult).toEqual({ count: 1, duration: 1 });
		expect(dumpResult).toBeInstanceOf(ArrayBuffer);
	});
});
