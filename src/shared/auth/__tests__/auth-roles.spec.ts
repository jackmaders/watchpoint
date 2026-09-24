import { describe, expect, test } from "vitest";
import { hasAdminPermission } from "../auth-roles";

describe("hasAdminPermission", () => {
	test("recognizes a user with the admin role", () => {
		expect(hasAdminPermission({ role: "admin" })).toBe(true);
	});

	test("rejects a regular user", () => {
		expect(hasAdminPermission({ role: "user" })).toBe(false);
	});

	test("rejects a missing role", () => {
		expect(hasAdminPermission({})).toBe(false);
	});
});
