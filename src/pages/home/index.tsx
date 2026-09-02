/**
 * Public API for the landing and home page slice.
 *
 * Re-exports the public interface of `src/pages/home/` adhering to Feature-Sliced Design (FSD).
 * Exposes loaders, route options, and page UI components for the initial entrypoint briefing.
 */
export { loadHomePage } from "./api/loaders";
export { homeRouteOptions } from "./model/route-options";
export { HomePage } from "./ui/home-page";
export { HomeRouteComponent } from "./ui/home-route";
