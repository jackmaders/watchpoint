import { getSessionManifest } from "@/shared/db";
import { normalizeSessionManifestModules } from "./session-manifest-query";

export async function handleGetVodManifest(
	request: Request,
	{ params }: { params: Promise<{ id: string }> | { id: string } },
) {
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
