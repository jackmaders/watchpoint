import { createServerFn } from "@tanstack/react-start";
import { importDemoLessonSchema } from "@/entities/lesson";
import {
	lessonDemoImportOperation,
	withLessonErrorStatus,
} from "@/entities/lesson/index.server";
import { authMiddleware } from "@/shared/auth";

export const importDemoLesson = createServerFn({ method: "POST" })
	.middleware([authMiddleware])
	.validator(importDemoLessonSchema)
	.handler(({ data, context }) =>
		withLessonErrorStatus(() =>
			lessonDemoImportOperation({
				...data,
				userId: context.session.user.id,
			}),
		),
	);
