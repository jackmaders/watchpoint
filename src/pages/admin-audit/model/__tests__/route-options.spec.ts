import { describe, expect, it } from "vitest";
import { loadAdminAudit } from "../../api/loaders";
import { AdminAuditRouteComponent } from "../../ui/admin-audit-route";
import { adminAuditRouteOptions } from "../route-options";
import type { AuditSearchParams } from "../search-params";
import { validateAuditSearch } from "../search-params";

describe("admin-audit route options", () => {
	it("wires adminAuditRouteOptions and validates search params", () => {
		// Arrange & Act & Assert
		expect(adminAuditRouteOptions.loader).toBe(loadAdminAudit);
		expect(adminAuditRouteOptions.component).toBe(AdminAuditRouteComponent);
		expect(adminAuditRouteOptions.validateSearch).toBe(validateAuditSearch);

		const search = { page: 1 } as AuditSearchParams;
		const deps = adminAuditRouteOptions.loaderDeps({ search });
		expect(deps).toBe(search);
	});
});
