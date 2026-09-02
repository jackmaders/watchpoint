/**
 * Route loader for fetching single VOD training metadata and scenario manifests.
 *
 * Implements `loadVodsIdPage` retrieving VOD session manifests via `getVodById` and throwing `notFound()`
 * when the requested VOD is missing or unpublished.
 */
import { notFound } from "@tanstack/react-router";
import { getVodById } from "@/entities/vod";

export async function loadVodsIdPage({ params }: { params: { id: string } }) {
	const vod = await getVodById({ data: { id: params.id } });
	if (!vod) {
		throw notFound();
	}
	return { vod };
}
