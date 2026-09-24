import { createServerFn } from "@tanstack/react-start";
import { submitLessonAnswerSchema } from "@/entities/lesson";
import {
	lessonAnswerSubmitOperation,
	withLessonErrorStatus,
} from "@/entities/lesson/index.server";
import { authMiddleware } from "@/shared/auth";

export const submitLessonAnswer = createServerFn({ method: "POST" })
	.middleware([authMiddleware])
	.validator(submitLessonAnswerSchema)
	.handler(({ data, context }) =>
		withLessonErrorStatus(() =>
			lessonAnswerSubmitOperation({
				...data,
				userId: context.session.user.id,
			}),
		),
	);
