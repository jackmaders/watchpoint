/**
 * Tests for createDbClient factory function.
 *
 * Verifies instantiating Drizzle D1 client per-request using the D1 binding from cloudflare:workers.
 */

import { describe, expect, it } from "vitest";
import { createDbClient } from "../client";

describe("createDbClient", () => {
	it("returns a drizzle client instance using the environment binding", () => {
		// Act
		const client = createDbClient();

		// Assert
		expect(client).toBeDefined();
		expect(typeof client.select).toBe("function");
	});
});
