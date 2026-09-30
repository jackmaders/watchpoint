import { describe, expect, test } from "vitest";
import { compareStringsByCodeUnit } from "../compare-strings-by-code-unit";

describe("compareStringsByCodeUnit", () => {
	test("returns -1 when the left string precedes the right string", () => {
		const left = "apple";
		const right = "banana";

		const result = compareStringsByCodeUnit(left, right);

		expect(result).toBe(-1);
	});

	test("returns 1 when the left string succeeds the right string", () => {
		const left = "banana";
		const right = "apple";

		const result = compareStringsByCodeUnit(left, right);

		expect(result).toBe(1);
	});

	test("returns 0 when both strings are identical", () => {
		const left = "watchpoint";
		const right = "watchpoint";

		const result = compareStringsByCodeUnit(left, right);

		expect(result).toBe(0);
	});

	test("compares UTF-16 code units so uppercase precedes lowercase", () => {
		const left = "Alpha";
		const right = "alpha";

		const result = compareStringsByCodeUnit(left, right);

		expect(result).toBe(-1);
	});

	test("returns -1 when left is a shorter prefix of right", () => {
		const left = "test";
		const right = "testing";

		const result = compareStringsByCodeUnit(left, right);

		expect(result).toBe(-1);
	});
});
