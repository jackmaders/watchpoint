import { describe, expect, it, vi } from "vitest";

vi.mock("./client");

import { prisma } from "./client";

describe("db client", () => {
	it("initializes Prisma client instance", () => {
		expect(prisma).toBeDefined();
	});
});
