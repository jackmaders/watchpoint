import { getSessionManifest } from "@/shared/db";
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

	const manifest = await getSessionManifest(id, {
		modules: normalizeSessionManifestModules(
			url.searchParams.getAll("modules"),
		),
	});

	if (!manifest) {
		return Response.json({ error: "VOD not found" }, { status: 404 });
	}

	return Response.json(manifest, { status: 200 });
}
