/**
 * Route configuration options for the server-side VOD timeline manifest API endpoint.
 *
 * Configures HTTP request method bindings via `vodManifestApiRouteOptions` to delegate `GET`
 * requests to `handleVodManifestRequest`.
 */
import { handleVodManifestRequest } from "../api/manifest";

export const vodManifestApiRouteOptions = {
	server: {
		handlers: {
			GET: handleVodManifestRequest,
		},
	},
};
