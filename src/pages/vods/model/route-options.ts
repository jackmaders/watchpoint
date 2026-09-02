/**
 * Route configuration options for the VOD catalog browser page (`/vods`).
 *
 * Configures `vodsRouteOptions` binding `loadVodsPage` to `VodsRouteComponent`.
 */
import { loadVodsPage } from "../api/loaders";
import { VodsRouteComponent } from "../ui/vods-route";

export const vodsRouteOptions = {
	component: VodsRouteComponent,
	loader: loadVodsPage,
};
