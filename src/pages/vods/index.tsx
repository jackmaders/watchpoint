/**
 * Public API for the public VOD catalog and training browser page slice.
 *
 * Re-exports the public interface of `src/pages/vods/` adhering to Feature-Sliced Design (FSD).
 * Exposes loaders, server functions, route options, and catalog page components.
 */
export { loadVodsPage } from "./api/loaders";
export { getPublishedVods } from "./api/server-fns";
export { vodsRouteOptions } from "./model/route-options";
export { VodsPage } from "./ui/vods-page";
export { VodsRouteComponent } from "./ui/vods-route";
