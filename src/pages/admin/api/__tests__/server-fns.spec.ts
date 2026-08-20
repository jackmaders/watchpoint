import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@tanstack/react-start");
vi.mock("@/shared/lib/permissions");

import { requirePermission } from "@/shared/lib/permissions";
import { checkAdminAccess } from "../server-fns";

describe("admin layout server-fns", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("returns user details when user has admin capability", async () => {
		// Arrange
		vi.mocked(requirePermission).mockResolvedValueOnce({
			email: "admin@example.com",
			id: "usr_admin",
			name: "Admin User",
			role: "ADMIN",
		});

		// Act
		const result = await (
			checkAdminAccess as unknown as () => Promise<unknown>
		)();

		// Assert
		expect(requirePermission).toHaveBeenCalledWith("admin:access");
		expect(result).toEqual({
			email: "admin@example.com",
			id: "usr_admin",
			name: "Admin User",
			role: "ADMIN",
		});
	});

	it("throws 403 Forbidden when ordinary player checks admin access", async () => {
		// Arrange
		vi.mocked(requirePermission).mockRejectedValueOnce(
			new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 }),
		);

		// Act & Assert
		await expect(
			(checkAdminAccess as unknown as () => Promise<unknown>)(),
		).rejects.toSatisfy((err: unknown) => {
			return err instanceof Response && err.status === 403;
		});
	});

	it("throws 401 Unauthorized when unauthenticated visitor checks admin access", async () => {
		// Arrange
		vi.mocked(requirePermission).mockRejectedValueOnce(
			new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 }),
		);

		// Act & Assert
		await expect(
			(checkAdminAccess as unknown as () => Promise<unknown>)(),
		).rejects.toSatisfy((err: unknown) => {
			return err instanceof Response && err.status === 401;
		});
	});
});
