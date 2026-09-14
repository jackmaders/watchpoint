/**
 * Route request handler for serving pre-loaded VOD session manifests filtered by learning module type.
 *
 * Provides HTTP endpoint adapters `handleGetVodManifest` and `handleVodManifestRequest` for the timeline
 * manifest endpoint. Verifies user authentication, parses module query parameters, invokes direct query functions,
 * and serializes the ordered scenario bundle as JSON.
 */
import { createDbClient, getVodById, queryScenarios } from "@/shared/db";
import { getCurrentUser } from "@/shared/lib/auth";
import type { SessionManifest } from "../model/types";
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
	const modules = normalizeSessionManifestModules(
		url.searchParams.getAll("modules"),
	);

	const db = createDbClient();
	const vod = await getVodById(id, db);
	if (!vod) {
		return Response.json({ error: "VOD not found" }, { status: 404 });
	}

	const filter: Record<string, unknown> = {
		vodId: { eq: id },
	};
	if (modules && modules.length > 0) {
		filter.moduleType = { in: modules };
	}

	const scenariosList = await queryScenarios(
		{
			filter,
			order: { timestampSeconds: "asc" },
		},
		db,
	);

	const manifest: SessionManifest = {
		...vod,
		scenarios: scenariosList,
	};

	return Response.json(manifest, { status: 200 });
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
