import { getCloudflareContext } from "@opennextjs/cloudflare";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getDb } from "./client";

vi.mock("@opennextjs/cloudflare");
vi.mock("react");

describe("db client", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.unstubAllEnvs();
		delete globalThis.db;
	});

	afterEach(() => {
		vi.unstubAllEnvs();
		delete globalThis.db;
	});

	it("returns globalThis.db if already initialized", async () => {
		const existingClient = { query: {} } as never;
		globalThis.db = existingClient;

		const db = await getDb();

		expect(db).toBe(existingClient);
	});

	it("resolves D1 database adapter when Cloudflare context is available in development", async () => {
		vi.stubEnv("NODE_ENV", "development");
		const mockDb = {
			prepare: vi.fn(),
		} as never;
		vi.mocked(getCloudflareContext).mockReturnValueOnce({
			env: { DB: mockDb },
		} as never);

		const db = await getDb();

		expect(db).toBeDefined();
		expect(globalThis.db).toBe(db);
	});

	it("resolves D1 database adapter in production without setting globalThis.db", async () => {
		vi.stubEnv("NODE_ENV", "production");
		const mockDb = {
			prepare: vi.fn(),
		} as never;
		vi.mocked(getCloudflareContext).mockReturnValueOnce({
			env: { DB: mockDb },
		} as never);

		const db = await getDb();

		expect(db).toBeDefined();
		expect(globalThis.db).toBeUndefined();
	});
});
