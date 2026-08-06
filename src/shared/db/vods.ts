import type { Prisma } from "../../../generated/prisma/client";
import { db } from "./client";

export type PublishedVodItem = Prisma.VodGetPayload<{
	include: {
		_count: {
			select: { scenarios: true };
		};
	};
}>;

export interface GetVodByIdOptions {
	publishedOnly?: boolean;
}

export async function getPublishedVods(): Promise<PublishedVodItem[]> {
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

export async function getVodById(
	id: string,
	options: GetVodByIdOptions = { publishedOnly: true },
) {
	const { publishedOnly = true } = options;
	return db.vod.findFirst({
		include: {
			scenarios: {
				orderBy: { timestampSeconds: "asc" },
			},
		},
		where: {
			id,
			...(publishedOnly ? { isPublished: true } : {}),
		},
	});
}
