/**
 * Route options and loader bindings for the interactive VOD training session view.
 *
 * Configures `vodsIdSessionRouteOptions` binding `loadVodsIdSessionPage`, `VodsIdSessionRouteComponent`,
 * and `sessionSearchSchema` to manage training session URL query states.
 */
import { loadVodsIdSessionPage } from "../api/loaders";
import { VodsIdSessionRouteComponent } from "../ui/vods-id-session-route";
import { sessionSearchSchema } from "./session-search";

export const vodsIdSessionRouteOptions = {
	component: VodsIdSessionRouteComponent,
	loader: loadVodsIdSessionPage,
	loaderDeps: ({ search }: { search: Record<string, unknown> }) => search,
	validateSearch: sessionSearchSchema,
};
