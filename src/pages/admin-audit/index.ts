/**
 * Public API for the admin audit log inspection page slice.
 *
 * Re-exports the public interface of the `src/pages/admin-audit/` slice adhering to Feature-Sliced
 * Design (FSD) architecture. Exposes route options, loaders, server functions, search param schemas,
 * and page components for audit trail review.
 */
export * from "./api/loaders";
export * from "./api/server-fns";
export * from "./model/route-options";
export * from "./model/search-params";
export * from "./ui/admin-audit-page";
export * from "./ui/admin-audit-route";
