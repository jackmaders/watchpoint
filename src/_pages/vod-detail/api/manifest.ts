import { NextResponse } from "next/server";
import { getVodManifest } from "@/shared/db";

export async function handleGetVodManifest(
	request: Request,
	{ params }: { params: Promise<{ id: string }> },
) {
	const { id } = await params;
	const url = new URL(request.url);

	const rawModules = url.searchParams.getAll("modules");
	const modulesList = rawModules
		.flatMap((m) => m.split(","))
		.map((m) => m.trim().toUpperCase())
		.filter(Boolean);

	const manifest = await getVodManifest(id, {
		modules: modulesList.length > 0 ? modulesList : undefined,
	});

	if (!manifest) {
		return NextResponse.json({ error: "VOD not found" }, { status: 404 });
	}

	return NextResponse.json(manifest, { status: 200 });
}
