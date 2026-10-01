import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/shared/auth";
import { serverErrorMiddleware } from "@/shared/errors";
import {
	completeLessonInputSchema,
	startLessonInputSchema,
	submitLessonAnswerInputSchema,
} from "../model/lesson-validation";
import {
	completeLessonHandler,
	startLessonHandler,
	submitLessonAnswerHandler,
} from "./lesson-handlers";

export const startLessonServerFn = createServerFn({ method: "POST" })
	.middleware([authMiddleware, serverErrorMiddleware])
	.validator(startLessonInputSchema)
	.handler(async ({ data, context }) =>
		startLessonHandler({ ...data, userId: context.session.user.id }),
	);

export const submitLessonAnswerServerFn = createServerFn({ method: "POST" })
	.middleware([authMiddleware, serverErrorMiddleware])
	.validator(submitLessonAnswerInputSchema)
	.handler(async ({ data, context }) =>
		submitLessonAnswerHandler({ ...data, userId: context.session.user.id }),
	);

export const completeLessonServerFn = createServerFn({ method: "POST" })
	.middleware([authMiddleware, serverErrorMiddleware])
	.validator(completeLessonInputSchema)
	.handler(async ({ data, context }) =>
		completeLessonHandler({ ...data, userId: context.session.user.id }),
	);
