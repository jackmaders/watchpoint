import { createServerFn } from "@tanstack/react-start";
import {
	postCreateHandler,
	postInsertSchema,
} from "@/entities/post/index.server";
import { authMiddleware } from "@/shared/auth";
import { dbMiddleware } from "@/shared/db/index.server";
import { serverErrorMiddleware } from "@/shared/errors";

export const postCreateServerFn = createServerFn({ method: "POST" })
	.middleware([authMiddleware, dbMiddleware, serverErrorMiddleware])
	.validator(postInsertSchema)
	.handler(({ data, context }) => postCreateHandler(data, context.db));
