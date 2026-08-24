import { handleVodManifestRequest } from "../api/manifest";

export const vodManifestApiRouteOptions = {
	server: {
		handlers: {
			GET: handleVodManifestRequest,
		},
	},
};
