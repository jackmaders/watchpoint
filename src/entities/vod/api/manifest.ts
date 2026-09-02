/**
 * Route request handler for serving pre-loaded VOD session manifests filtered by learning module type.
 *
 * Provides HTTP endpoint adapters `handleGetVodManifest` and `handleVodManifestRequest` for the timeline
 * manifest endpoint. Verifies user authentication, parses module query parameters, invokes `vodService.getSessionManifest`,
 * and serializes the ordered scenario bundle as JSON.
 */
import { vodService } from "@/shared/db";
import { getCurrentUser } from "@/shared/lib/auth";
import { normalizeSessionManifestModules } from "./session-manifest-query";

export async function handleGetVodManifest(
	request: Request,
	{ params }: { params: Promise<{ id: string }> | { id: string } },
) {
	if (!(await getCurrentUser(request.headers))) {
		return Response.json({ error: "Authentication required" }, { status: 401 });
	}

	const { id } = await params;
	const url = new URL(request.url);

	const manifestResult = await vodService.getSessionManifest({
		id,
		modules: normalizeSessionManifestModules(
			url.searchParams.getAll("modules"),
		),
	});

	if (!manifestResult.success || !manifestResult.data) {
		return Response.json({ error: "VOD not found" }, { status: 404 });
	}

	return Response.json(manifestResult.data, { status: 200 });
}

export async function handleVodManifestRequest({
	params,
	request,
}: {
	params: { id: string };
	request: Request;
}): Promise<Response> {
	return handleGetVodManifest(request, {
		params: Promise.resolve({ id: params.id }),
	});
}
