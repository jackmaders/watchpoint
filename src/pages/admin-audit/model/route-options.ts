import { loadAdminAudit } from "../api/loaders";
import { AdminAuditRouteComponent } from "../ui/admin-audit-route";
import type { AuditSearchParams } from "./search-params";
import { validateAuditSearch } from "./search-params";

export const adminAuditRouteOptions = {
	component: AdminAuditRouteComponent,
	loader: loadAdminAudit,
	loaderDeps: ({ search }: { search: AuditSearchParams }) => search,
	validateSearch: validateAuditSearch,
};
