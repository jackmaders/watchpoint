import { getDb } from "@/shared/db/index.server";
import {
	evaluateVodLessonAccess,
	type UserSessionLike,
	type VodLessonAccessMode,
} from "../model/vod-access-policy";
import type { VodCatalogItem, VodDetail } from "../model/vod-types";
import { vodCatalogSchema } from "../model/vod-validation";

export async function publishedVodListHandler(db = getDb()) {
	const rows = await db.query.vods.findMany({
		where: { isPublished: true },
		orderBy: { createdAt: "desc" },
		with: {
			questions: {
				columns: {},
				with: {
					skill: true,
				},
			},
		},
	});

	const catalog: VodCatalogItem[] = rows.map(({ questions, ...vod }) => {
		const uniqueSkills = new Map(
			questions.flatMap(({ skill }) => {
				if (!skill) {
					return [];
				}
				return [[skill.id, skill] as const];
			}),
		);

		return {
			...vod,
			questionCount: questions.length,
			skills: [...uniqueSkills.values()],
		};
	});

	return vodCatalogSchema.parse(catalog);
}

export async function getDemoVodHandler(db = getDb()) {
	const demoVod = await db.query.vods.findFirst({
		where: { isDemo: true },
	});

	return demoVod ?? null;
}

export async function getVodByIdHandler(id: string, db = getDb()) {
	const vod = await db.query.vods.findFirst({
		where: { id },
	});

	return vod ?? null;
}

export type VodLessonAccessHandlerResult =
	| {
			readonly status: "allow";
			readonly mode: VodLessonAccessMode;
			readonly vod: VodDetail;
	  }
	| {
			readonly status: "redirect";
			readonly to: string;
			readonly returnTo: string;
	  }
	| {
			readonly status: "not-found";
	  };

export interface GetVodLessonAccessParams {
	readonly returnTo?: string;
	readonly session: UserSessionLike | null;
	readonly vodId: string;
}

export async function getVodLessonAccessHandler(
	{ vodId, session, returnTo }: GetVodLessonAccessParams,
	db = getDb(),
): Promise<VodLessonAccessHandlerResult> {
	const vod = await getVodByIdHandler(vodId, db);
	if (!vod) {
		return { status: "not-found" };
	}

	const access = evaluateVodLessonAccess({ vod, session, returnTo });
	if (access.status !== "allow") {
		return access;
	}

	return {
		status: "allow",
		mode: access.mode,
		vod,
	};
}
