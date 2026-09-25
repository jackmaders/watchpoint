import { createServerFn } from "@tanstack/react-start";
import { submitLessonAnswerSchema } from "@/entities/lesson";
import { createLessonOperations } from "@/entities/lesson/index.server";
import { authMiddleware } from "@/shared/auth";

export const submitLessonAnswer = createServerFn({ method: "POST" })
	.middleware([authMiddleware])
	.validator(submitLessonAnswerSchema)
	.handler(({ data, context }) =>
		createLessonOperations().lessonAnswerSubmitOperation({
			...data,
			userId: context.session.user.id,
		}),
	);
