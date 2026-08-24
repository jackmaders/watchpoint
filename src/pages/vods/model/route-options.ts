import { loadVodsPage } from "../api/loaders";
import { VodsRouteComponent } from "../ui/vods-route";

export const vodsRouteOptions = {
	component: VodsRouteComponent,
	loader: loadVodsPage,
};
