/**
 * Route configuration options for the root landing page (`/`).
 *
 * Configures `homeRouteOptions` binding `loadHomePage` to `HomeRouteComponent`.
 */
import { loadHomePage } from "../api/loaders";
import { HomeRouteComponent } from "../ui/home-route";

export const homeRouteOptions = {
	component: HomeRouteComponent,
	loader: loadHomePage,
};
