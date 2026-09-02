/**
 * Unit test suite verifying test environment network isolation and unmocked fetch prevention.
 *
 * Validates that global fetch traps intercept unmocked network requests with string URLs, `URL` instances,
 * and `Request` objects, enforcing strict test isolation across unit test suites.
 */

import { describe, expect, it } from "vitest";

describe("network guard setup", () => {
	it("throws an error when unmocked string url fetch is attempted", () => {
		// Arrange
		const url = "http://127.0.0.1:3000/api/test";

		// Act & Assert
		expect(() => fetch(url)).toThrow(
			/Unmocked network request to "http:\/\/127\.0\.0\.1:3000\/api\/test"/,
		);
	});

	it("throws an error when unmocked URL instance fetch is attempted", () => {
		// Arrange
		const url = new URL("https://example.com/api/test");

		// Act & Assert
		expect(() => fetch(url)).toThrow(
			/Unmocked network request to "https:\/\/example\.com\/api\/test"/,
		);
	});

	it("throws an error when unmocked Request object fetch is attempted", () => {
		// Arrange
		const request = new Request("https://example.com/api/request-test");

		// Act & Assert
		expect(() => fetch(request)).toThrow(
			/Unmocked network request to "https:\/\/example\.com\/api\/request-test"/,
		);
	});
});
