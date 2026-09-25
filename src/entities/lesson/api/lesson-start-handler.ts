import { lessonSelectedSkills, lessons } from "@/shared/db";
import { requireSkills, requireVod } from "./lesson-data";
import type {
	LessonDatabase,
	StartLessonHandlerInput,
} from "./lesson-handler-types";
import { validateUniqueIds } from "./lesson-handler-validation";

export async function startLessonHandler(
	db: LessonDatabase,
	{ userId, vodId, selectedSkillIds }: StartLessonHandlerInput,
) {
	const normalizedSkillIds = validateUniqueIds(selectedSkillIds);
	await requireVod(db, vodId);
	await requireSkills(db, normalizedSkillIds);

	const lessonId = crypto.randomUUID();
	const now = new Date();

	await db.batch([
		db.insert(lessons).values({
			id: lessonId,
			userId,
			vodId,
			status: "in_progress",
			createdAt: now,
			updatedAt: now,
		}),
		...normalizedSkillIds.map((skillId) =>
			db.insert(lessonSelectedSkills).values({ lessonId, skillId }),
		),
	]);

	return { lessonId };
}
