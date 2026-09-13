/**
 * Public API for the landing and home page slice.
 *
 * Re-exports the public interface of `src/pages/home/` adhering to Feature-Sliced Design (FSD).
 * Exposes loaders, server functions, route options, model types, and page UI components.
 */
export {
	fetchHomePage,
	homePageQueryOptions,
	loadHomePage,
} from "./api/loaders";
export { homeRouteOptions } from "./model/route-options";
export type { PublishedVodItem } from "./model/types";
export { HomePage } from "./ui/home-page";
export { HomeRouteComponent } from "./ui/home-route";
