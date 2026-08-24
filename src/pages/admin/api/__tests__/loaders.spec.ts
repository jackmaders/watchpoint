import { redirect } from "@tanstack/react-router";
import { describe, expect, it, vi } from "vitest";
import { adminIndexBeforeLoad } from "../loaders";

vi.mock("@tanstack/react-router");

describe("adminIndexBeforeLoad", () => {
	it("redirects to /admin/content", () => {
		expect(() => adminIndexBeforeLoad()).toThrow();
		expect(redirect).toHaveBeenCalledWith({ to: "/admin/content" });
	});
});
