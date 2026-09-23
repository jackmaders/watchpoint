import "@tanstack/react-start/server-only";

export { getDb } from "./db.server";
export {
	account,
	type Lesson,
	type LessonAnswer,
	type LessonSelectedSkill,
	lessonAnswers,
	lessonSelectedSkills,
	lessons,
	type NewLesson,
	type NewLessonAnswer,
	type NewLessonSelectedSkill,
	type NewOption,
	type NewQuestion,
	type NewSkill,
	type NewVod,
	type Option,
	options,
	posts,
	type Question,
	type QuestionSnapshot,
	questions,
	relations,
	type Skill,
	session,
	skills,
	user,
	type Vod,
	verification,
	vods,
} from "./schema";
export {
	BASELINE_SKILLS,
	SAMPLE_QUESTIONS,
	SAMPLE_VOD,
	seed,
} from "./seed";
