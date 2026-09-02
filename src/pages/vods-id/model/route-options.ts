/**
 * Route options configuration for the VOD landing and pre-session configuration view.
 *
 * Configures `vodsIdRouteOptions` binding `loadVodsIdPage` to `VodsIdRouteComponent`.
 */
import { loadVodsIdPage } from "../api/loaders";
import { VodsIdRouteComponent } from "../ui/vods-id-route";

export const vodsIdRouteOptions = {
	component: VodsIdRouteComponent,
	loader: loadVodsIdPage,
};
