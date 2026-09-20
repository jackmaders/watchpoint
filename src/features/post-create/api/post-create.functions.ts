import { createServerFn } from "@tanstack/react-start";
import { postInsertSchema } from "@/entities/post";
import { createPostRecord } from "@/entities/post/index.server";

export const createPost = createServerFn({ method: "POST" })
	.validator(postInsertSchema)
	.handler(async ({ data }) => createPostRecord(data));
