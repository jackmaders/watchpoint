import { loadHomePage } from "../api/loaders";
import { HomeRouteComponent } from "../ui/home-route";

export const homeRouteOptions = {
	component: HomeRouteComponent,
	loader: loadHomePage,
};
