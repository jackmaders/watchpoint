/**
 * Public API for the VOD detail and pre-session configuration page slice.
 *
 * Re-exports the public interface of `src/pages/vods-id/` adhering to Feature-Sliced Design (FSD).
 * Exposes loaders, route options, client interactive components, and page presentations.
 */
export { loadVodsIdPage } from "./api/loaders";
export { vodsIdRouteOptions } from "./model/route-options";
export { VodsIdClient } from "./ui/vods-id-client";
export { VodsIdPage } from "./ui/vods-id-page";
export { VodsIdRouteComponent } from "./ui/vods-id-route";
