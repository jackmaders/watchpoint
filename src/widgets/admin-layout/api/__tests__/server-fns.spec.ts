import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@tanstack/react-start");
vi.mock("@/shared/lib/permissions");

import { requirePermission } from "@/shared/lib/permissions";
import { checkAdminAccess } from "../server-fns";

describe("admin layout server-fns", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("checks admin access permission", async () => {
		// Arrange
		const mockUser = { id: "usr_admin", role: "ADMIN" as const };
		vi.mocked(requirePermission).mockResolvedValueOnce(mockUser as never);

		// Act
		const result = await (
			checkAdminAccess as unknown as () => Promise<unknown>
		)();

		// Assert
		expect(requirePermission).toHaveBeenCalledWith("admin:access");
		expect(result).toBe(mockUser);
	});
});
