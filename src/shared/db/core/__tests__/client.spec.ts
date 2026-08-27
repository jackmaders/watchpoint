import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getDb } from "../client";

vi.mock("wrangler");

interface GlobalEnvMock {
	DB?: unknown;
	__env__?: { DB?: unknown };
	db?: unknown;
}

const mockGlobals = globalThis as unknown as GlobalEnvMock;

describe("db client", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.unstubAllEnvs();
		delete mockGlobals.db;
		delete mockGlobals.DB;
		delete mockGlobals.__env__;
	});

	afterEach(() => {
		vi.unstubAllEnvs();
		delete mockGlobals.db;
		delete mockGlobals.DB;
		delete mockGlobals.__env__;
	});

	it("returns globalThis.db if already initialized", async () => {
		// Arrange
		const existingClient = { query: {} } as never;
		mockGlobals.db = existingClient;

		// Act
		const db = await getDb();

		// Assert
		expect(db).toBe(existingClient);
	});

	it("resolves D1 database from context.env.DB in development and sets globalThis.db", async () => {
		// Arrange
		vi.stubEnv("NODE_ENV", "development");
		const mockD1 = { prepare: vi.fn() } as never;

		// Act
		const db = await getDb({ env: { DB: mockD1 } });

		// Assert
		expect(db).toBeDefined();
		expect(mockGlobals.db).toBe(db);
	});

	it("resolves D1 database from context.DB in production without setting globalThis.db", async () => {
		// Arrange
		vi.stubEnv("NODE_ENV", "production");
		const mockD1 = { prepare: vi.fn() } as never;

		// Act
		const db = await getDb({ DB: mockD1 });

		// Assert
		expect(db).toBeDefined();
		expect(mockGlobals.db).toBeUndefined();
	});

	it("resolves D1 database from context.cloudflare.env.DB", async () => {
		// Arrange
		vi.stubEnv("NODE_ENV", "test");
		const mockD1 = { prepare: vi.fn() } as never;

		// Act
		const db = await getDb({ cloudflare: { env: { DB: mockD1 } } });

		// Assert
		expect(db).toBeDefined();
	});

	it("resolves D1 database from globalThis.DB fallback", async () => {
		// Arrange
		vi.stubEnv("NODE_ENV", "test");
		const mockD1 = { prepare: vi.fn() } as never;
		mockGlobals.DB = mockD1;

		// Act
		const db = await getDb();

		// Assert
		expect(db).toBeDefined();
	});

	it("resolves D1 database from wrangler getPlatformProxy fallback when context and globals are empty", async () => {
		// Arrange
		vi.stubEnv("NODE_ENV", "test");
		const mockD1 = { prepare: vi.fn() } as never;
		const { getPlatformProxy } = await import("wrangler");
		vi.mocked(getPlatformProxy).mockResolvedValueOnce({
			dispose: vi.fn(),
			env: { DB: mockD1 },
		} as never);

		// Act
		const db = await getDb({});

		// Assert
		expect(db).toBeDefined();
		expect(getPlatformProxy).toHaveBeenCalled();
	});

	it("throws error when D1 binding cannot be resolved", async () => {
		// Arrange
		vi.stubEnv("NODE_ENV", "test");
		const { getPlatformProxy } = await import("wrangler");
		vi.mocked(getPlatformProxy).mockRejectedValueOnce(
			new Error("Proxy failed"),
		);

		// Act
		const promise = getDb({});

		// Assert
		await expect(promise).rejects.toThrow(
			/Cloudflare D1 database binding \(DB\) not found/,
		);
	});
});
