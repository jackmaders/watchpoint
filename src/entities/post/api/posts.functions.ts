import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/shared/auth";
import { dbMiddleware } from "@/shared/db/db-middleware";
import { serverErrorMiddleware } from "@/shared/errors";
import { postListHandler } from "./posts-handlers.server";

export const postListServerFn = createServerFn({ method: "GET" })
	.middleware([authMiddleware, dbMiddleware, serverErrorMiddleware])
	.handler(({ context }) => postListHandler(context.db));
