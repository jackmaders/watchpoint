import { eq, inArray } from "drizzle-orm";
import { skills, vods } from "@/shared/db";
import { LessonNotFoundError } from "../model/lesson-errors";
import type { LessonDatabase } from "./lesson-handler-types";

export async function requireVod(db: LessonDatabase, vodId: string) {
	const [vod] = await db
		.select({ id: vods.id, isDemo: vods.isDemo })
		.from(vods)
		.where(eq(vods.id, vodId))
		.limit(1);

	if (!vod) {
		throw new LessonNotFoundError("VOD");
	}

	return vod;
}

export async function requireSkills(db: LessonDatabase, skillIds: string[]) {
	const existingSkills = await db
		.select({ id: skills.id })
		.from(skills)
		.where(inArray(skills.id, skillIds));

	if (existingSkills.length !== skillIds.length) {
		throw new LessonNotFoundError("One or more Skills");
	}
}
