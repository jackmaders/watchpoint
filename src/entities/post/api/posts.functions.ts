import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/shared/auth";
import { serverErrorMiddleware } from "@/shared/errors";
import { postListHandler } from "./posts-handlers.server";

export const postListServerFn = createServerFn({ method: "GET" })
	.middleware([authMiddleware, serverErrorMiddleware])
	.handler(() => postListHandler());
