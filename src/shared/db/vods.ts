import { db } from "./client";

export async function getPublishedVods() {
	return db.vod.findMany({
		include: {
			_count: {
				select: { scenarios: true },
			},
		},
		orderBy: { createdAt: "desc" },
		where: { isPublished: true },
	});
}

export async function getVodById(id: string) {
	return db.vod.findUnique({
		include: {
			scenarios: {
				orderBy: { timestampSeconds: "asc" },
			},
		},
		where: { id },
	});
}
