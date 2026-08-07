import { getCloudflareContext } from "@opennextjs/cloudflare";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@opennextjs/cloudflare");

describe("db client", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.unstubAllEnvs();
		delete globalThis.prisma;

		vi.resetModules();
	});

	afterEach(() => {
		vi.unstubAllEnvs();
		delete globalThis.prisma;
	});

	it("returns globalThis.prisma if already initialized", async () => {
		const existingClient = { vod: {} } as never;
		globalThis.prisma = existingClient;

		// Dynamically import inside the test block
		const { prisma } = await import("./client");

		expect(prisma).toBe(existingClient);
	});

	it("resolves D1 database adapter when Cloudflare context is available in development", async () => {
		vi.stubEnv("NODE_ENV", "development");
		const mockDb = {
			prepare: vi.fn(),
		} as never;
		vi.mocked(getCloudflareContext).mockReturnValueOnce({
			env: { DB: mockDb },
		} as never);

		const { prisma } = await import("./client");

		expect(prisma).toBeDefined();
		expect(globalThis.prisma).toBe(prisma);
	});

	it("resolves D1 database adapter in production without setting globalThis.prisma", async () => {
		vi.stubEnv("NODE_ENV", "production");
		const mockDb = {
			prepare: vi.fn(),
		} as never;
		vi.mocked(getCloudflareContext).mockReturnValueOnce({
			env: { DB: mockDb },
		} as never);

		const { prisma } = await import("./client");

		expect(prisma).toBeDefined();
		expect(globalThis.prisma).toBeUndefined();
	});
});
