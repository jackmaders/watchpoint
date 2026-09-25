import { createServerFn } from "@tanstack/react-start";
import { lessonCompletionSchema } from "@/entities/lesson";
import { createLessonOperations } from "@/entities/lesson/index.server";
import { authMiddleware } from "@/shared/auth";

export const completeLesson = createServerFn({ method: "POST" })
	.middleware([authMiddleware])
	.validator(lessonCompletionSchema)
	.handler(({ data, context }) =>
		createLessonOperations().lessonCompleteOperation({
			...data,
			userId: context.session.user.id,
		}),
	);
