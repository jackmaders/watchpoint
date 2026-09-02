/**
 * Public API for the root admin dashboard redirect page slice.
 *
 * Re-exports `adminIndexBeforeLoad` and `adminIndexRouteOptions` to automatically forward administrative
 * root visits (`/admin`) to `/admin/content`.
 */
export { adminIndexBeforeLoad } from "./api/loaders";
export { adminIndexRouteOptions } from "./model/route-options";
