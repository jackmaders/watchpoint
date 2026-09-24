import { createServerFn } from "@tanstack/react-start";
import { postInsertSchema } from "@/entities/post";
import { postCreateHandler } from "@/entities/post/index.server";
import { authMiddleware } from "@/shared/auth";

export const postCreateServerFn = createServerFn({ method: "POST" })
	.middleware([authMiddleware])
	.validator(postInsertSchema)
	.handler(({ data }) => postCreateHandler(data));
