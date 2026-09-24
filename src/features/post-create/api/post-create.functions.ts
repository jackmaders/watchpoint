import { createServerFn } from "@tanstack/react-start";
import {
	postCreateHandler,
	postInsertSchema,
} from "@/entities/post/index.server";
import { authMiddleware } from "@/shared/auth";
import { serverErrorMiddleware } from "@/shared/errors";

export const postCreateServerFn = createServerFn({ method: "POST" })
	.middleware([authMiddleware, serverErrorMiddleware])
	.validator(postInsertSchema)
	.handler(({ data }) => postCreateHandler(data));
