/**
 * Type-level tests verifying JSON primitive and composite value definitions.
 */

import { describe, expect, it } from "vitest";
import type { JsonPrimitive, JsonValue } from "../types";

describe("shared db types", () => {
	it("verifies JSON type structures", () => {
		const primitive: JsonPrimitive = "value";
		const json: JsonValue = {
			array: [1, 2, 3],
			bool: true,
			nested: { primitive },
			nullVal: null,
		};
		expect(json).toBeDefined();
	});
});
