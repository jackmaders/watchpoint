import { createServerFn } from "@tanstack/react-start";
import { postInsertSchema } from "@/entities/post";
import { postCreateOperation } from "@/entities/post/index.server";

export const postCreateServerFn = createServerFn({ method: "POST" })
	.validator(postInsertSchema)
	.handler(async ({ data }) => postCreateOperation(data));
