import { describe, expect, it } from "vitest";
import { add } from "./math";

describe("math", () => {
	it("adds two numbers correctly", () => {
		expect(add(2, 3)).toBe(5);
	});
});
