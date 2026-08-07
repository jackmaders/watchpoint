import { describe, expect, it, vi } from "vitest";

vi.mock("../db/client");

import { auth } from "./auth";

describe("auth", () => {
	it("initializes better-auth instance correctly", () => {
		expect(auth).toBeDefined();
		expect(auth.handler).toBeInstanceOf(Function);
	});
});
