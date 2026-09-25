import { describe, expect, test } from "vitest";
import {
	DEFAULT_VOD_TIMESTAMP_SECONDS,
	parseVodTimestamp,
	VOD_TIMESTAMP_PRECISION_SECONDS,
	VOD_TIMESTAMP_SEARCH_PARAM,
} from "@/shared/video";

describe("parseVodTimestamp", () => {
	test("defines the timestamp search parameter and precision", () => {
		expect(VOD_TIMESTAMP_SEARCH_PARAM).toBe("timestamp");
		expect(VOD_TIMESTAMP_PRECISION_SECONDS).toBe(0.001);
	});

	test("returns a missing timestamp fallback", () => {
		expect(parseVodTimestamp(undefined)).toBe(DEFAULT_VOD_TIMESTAMP_SECONDS);
	});

	test("accepts finite non-negative timestamp values", () => {
		expect(parseVodTimestamp("12.3456")).toBe(12.346);
		expect(parseVodTimestamp("0.029")).toBe(0.029);
		expect(parseVodTimestamp(0)).toBe(0);
	});

	test.each([
		"",
		" ",
		"not-a-number",
		-1,
		Number.NaN,
		Number.POSITIVE_INFINITY,
		true,
		{},
	])("falls back for invalid timestamp value %s", (value) => {
		expect(parseVodTimestamp(value)).toBe(DEFAULT_VOD_TIMESTAMP_SECONDS);
	});

	test("clamps a timestamp to a valid VOD duration", () => {
		expect(parseVodTimestamp("42.5", 30)).toBe(30);
	});

	test("ignores an invalid VOD duration when clamping", () => {
		expect(parseVodTimestamp("42.5", Number.NaN)).toBe(42.5);
		expect(parseVodTimestamp("42.5", -1)).toBe(42.5);
		expect(parseVodTimestamp("42.5", 0)).toBe(42.5);
	});
});
