import { describe, expect, it } from "vitest";
import { createDbClient, createMockAdapter, db } from "./client";

describe("db client", () => {
	it("initializes Prisma client instance", () => {
		expect(db).toBeDefined();
	});

	it("creates DB client with explicit D1 instance", () => {
		const mockD1 = {};
		const client = createDbClient(mockD1);
		expect(client).toBeDefined();
	});

	it("creates mock adapter with executeRaw and queryRaw methods", async () => {
		const adapter = createMockAdapter();
		expect(adapter.adapterName).toBe("@prisma/adapter-d1");
		expect(adapter.provider).toBe("sqlite");
		expect(await adapter.executeRaw()).toBe(0);
		expect(await adapter.queryRaw()).toEqual({ rows: [] });
	});
});
