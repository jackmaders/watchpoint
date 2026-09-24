import { createServerFn } from "@tanstack/react-start";
import { lessonCompletionSchema } from "@/entities/lesson";
import {
	lessonCompleteOperation,
	withLessonErrorStatus,
} from "@/entities/lesson/index.server";
import { authMiddleware } from "@/shared/auth";

export const completeLesson = createServerFn({ method: "POST" })
	.middleware([authMiddleware])
	.validator(lessonCompletionSchema)
	.handler(({ data, context }) =>
		withLessonErrorStatus(() =>
			lessonCompleteOperation({
				...data,
				userId: context.session.user.id,
			}),
		),
	);
