import { describe, expect, it } from "vitest";
import { auth } from "./auth";

describe("auth", () => {
	it("initializes better-auth instance correctly", () => {
		expect(auth).toBeDefined();
		expect(auth.handler).toBeInstanceOf(Function);
	});
});
