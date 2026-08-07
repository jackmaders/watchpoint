import { describe, expect, it, vi } from "vitest";
import { createD1PrismaClient, prisma } from "./client";

describe("db client", () => {
	it("initializes Prisma client instance", () => {
		expect(prisma).toBeDefined();
	});

	it("creates a Prisma client instance using D1 binding", () => {
		const fakeD1 = {} as unknown as D1Database;
		const d1Client = createD1PrismaClient(fakeD1);
		expect(d1Client).toBeDefined();
	});

	it("handles production environment branch gracefully", async () => {
		try {
			vi.stubEnv("NODE_ENV", "production");
			vi.resetModules();
			const prodModule = await import("./client");
			expect(prodModule.prisma).toBeDefined();
		} finally {
			vi.unstubAllEnvs();
			vi.resetModules();
		}
	});
});
