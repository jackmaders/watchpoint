/**
 * Tests for createDbClient factory function.
 *
 * Verifies instantiating Drizzle D1 client per-request using the D1 binding.
 */

import { describe, expect, it } from "vitest";
import { createDbClient } from "../client";

describe("createDbClient", () => {
	it("returns a drizzle client instance", () => {
		// Arrange
		const expectedProperty = "select";

		// Act
		const client = createDbClient();

		// Assert
		expect(client).toBeDefined();
		expect(typeof client.select).toBe("function");
		expect(expectedProperty in client).toBe(true);
	});
});
