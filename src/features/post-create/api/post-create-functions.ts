import { createServerFn } from "@tanstack/react-start";
import { postInsertSchema } from "@/entities/post";
import { authMiddleware } from "@/shared/auth";
import { postCreateHandler } from "./post-create-handlers";

export const postCreateServerFn = createServerFn({ method: "POST" })
	.middleware([authMiddleware])
	.validator(postInsertSchema)
	.handler(({ data }) => postCreateHandler(data));
