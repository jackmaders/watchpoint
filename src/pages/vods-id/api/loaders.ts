import { notFound } from "@tanstack/react-router";
import { getVodById } from "@/entities/vod";

export async function loadVodsIdPage({ params }: { params: { id: string } }) {
	const vod = await getVodById({ data: { id: params.id } });
	if (!vod) {
		throw notFound();
	}
	return { vod };
}
