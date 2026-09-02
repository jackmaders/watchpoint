/**
 * Public API for the admin user management and permission administration page slice.
 *
 * Re-exports the public interface of `src/pages/admin-users/` adhering to Feature-Sliced Design (FSD).
 * Exposes loaders, server functions, route options, and page UI components.
 */
export * from "./api/loaders";
export * from "./api/server-fns";
export * from "./model/route-options";
export * from "./ui/admin-users-page";
export * from "./ui/admin-users-route";
