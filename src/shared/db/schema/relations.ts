import { defineRelations } from "drizzle-orm";
import { user } from "./auth";
import { lessonAnswers, lessonSelectedSkills, lessons } from "./lessons";
import { options } from "./options";
import { questions } from "./questions";
import { skills } from "./skills";
import { vods } from "./vods";

export const relations = defineRelations(
	{
		skills,
		vods,
		questions,
		options,
		lessons,
		lessonSelectedSkills,
		lessonAnswers,
		user,
	},
	(r) => ({
		skills: {
			questions: r.many.questions(),
			lessonSelectedSkills: r.many.lessonSelectedSkills(),
		},
		vods: {
			questions: r.many.questions(),
			lessons: r.many.lessons(),
		},
		questions: {
			vod: r.one.vods({
				from: r.questions.vodId,
				to: r.vods.id,
			}),
			skill: r.one.skills({
				from: r.questions.skillId,
				to: r.skills.id,
			}),
			options: r.many.options(),
			lessonAnswers: r.many.lessonAnswers(),
		},
		options: {
			question: r.one.questions({
				from: r.options.questionId,
				to: r.questions.id,
			}),
			lessonAnswers: r.many.lessonAnswers(),
		},
		lessons: {
			user: r.one.user({
				from: r.lessons.userId,
				to: r.user.id,
			}),
			vod: r.one.vods({
				from: r.lessons.vodId,
				to: r.vods.id,
			}),
			selectedSkills: r.many.skills({
				from: r.lessons.id.through(r.lessonSelectedSkills.lessonId),
				to: r.skills.id.through(r.lessonSelectedSkills.skillId),
			}),
			answers: r.many.lessonAnswers(),
		},
		lessonSelectedSkills: {
			lesson: r.one.lessons({
				from: r.lessonSelectedSkills.lessonId,
				to: r.lessons.id,
			}),
			skill: r.one.skills({
				from: r.lessonSelectedSkills.skillId,
				to: r.skills.id,
			}),
		},
		lessonAnswers: {
			lesson: r.one.lessons({
				from: r.lessonAnswers.lessonId,
				to: r.lessons.id,
			}),
			question: r.one.questions({
				from: r.lessonAnswers.questionId,
				to: r.questions.id,
			}),
			selectedOption: r.one.options({
				from: r.lessonAnswers.selectedOptionId,
				to: r.options.id,
			}),
		},
	}),
);
