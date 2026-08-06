import { describe, expect, it } from "vitest";
import { prisma } from "./client";

describe("db client", () => {
	it("initializes Prisma client instance", () => {
		expect(prisma).toBeDefined();
	});
});
