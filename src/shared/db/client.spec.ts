import { describe, expect, it } from "vitest";
import { db } from "./client";

describe("db client", () => {
	it("initializes Prisma client instance", () => {
		expect(db).toBeDefined();
	});
});
