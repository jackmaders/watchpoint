import { createServerFn } from "@tanstack/react-start";
import { startLessonSchema } from "@/entities/lesson";
import {
	lessonStartOperation,
	withLessonErrorStatus,
} from "@/entities/lesson/index.server";
import { authMiddleware } from "@/shared/auth";

export const startLesson = createServerFn({ method: "POST" })
	.middleware([authMiddleware])
	.validator(startLessonSchema)
	.handler(({ data, context }) =>
		withLessonErrorStatus(() =>
			lessonStartOperation({
				...data,
				userId: context.session.user.id,
			}),
		),
	);
