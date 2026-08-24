import { loadVodsIdPage } from "../api/loaders";
import { VodsIdRouteComponent } from "../ui/vods-id-route";

export const vodsIdRouteOptions = {
	component: VodsIdRouteComponent,
	loader: loadVodsIdPage,
};
