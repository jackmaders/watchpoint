import { describe, expect, test } from "vitest";
import { isAdmin } from "../auth-roles";

describe("isAdmin", () => {
	test("recognizes a user with the admin role", () => {
		expect(isAdmin({ role: "admin" })).toBe(true);
	});

	test("rejects a regular user", () => {
		expect(isAdmin({ role: "user" })).toBe(false);
	});

	test("rejects a missing role", () => {
		expect(isAdmin({})).toBe(false);
	});
});
