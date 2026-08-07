import { describe, expect, it, vi } from "vitest";
import { prisma } from "./client";

describe("db client", () => {
	it("initializes Prisma client instance", () => {
		expect(prisma).toBeDefined();
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
