import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("db client", () => {
	const globalForPrisma = globalThis as unknown as { prisma?: unknown };

	beforeEach(() => {
		vi.resetModules();
		delete globalForPrisma.prisma;
	});

	afterEach(() => {
		vi.unstubAllEnvs();
		delete globalForPrisma.prisma;
	});

	it("initializes Prisma client instance and assigns global in non-production", async () => {
		vi.stubEnv("NODE_ENV", "development");
		const { prisma } = await import("./client");
		expect(prisma).toBeDefined();
		expect(globalForPrisma.prisma).toBe(prisma);
	});

	it("reuses existing global prisma instance if present", async () => {
		const mockPrisma = {} as never;
		globalForPrisma.prisma = mockPrisma;
		const { prisma } = await import("./client");
		expect(prisma).toBe(mockPrisma);
	});

	it("does not set global prisma in production", async () => {
		vi.stubEnv("NODE_ENV", "production");
		const { prisma } = await import("./client");
		expect(prisma).toBeDefined();
		expect(globalForPrisma.prisma).toBeUndefined();
	});
});
