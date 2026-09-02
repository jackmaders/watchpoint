/**
 * Public API for the admin VOD content editor and scenario management page slice.
 *
 * Re-exports the public interface of the `src/pages/admin-content-id/` slice adhering to Feature-Sliced
 * Design (FSD) architecture. Exposes loader functions, route options, and route components for editing VOD records.
 */
export { loadAdminContentIdPage } from "./api/loaders";
export { adminContentIdRouteOptions } from "./model/route-options";
export { AdminContentIdRouteComponent } from "./ui/admin-content-id-route";
