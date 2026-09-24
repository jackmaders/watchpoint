import { createServerFn } from "@tanstack/react-start";
import {
	postCreateOperation,
	postInsertSchema,
} from "@/entities/post/index.server";
import { ensureSession } from "@/shared/auth";

export const postCreateServerFn = createServerFn({ method: "POST" })
	.validator(postInsertSchema)
	.handler(async ({ data }) => {
		await ensureSession();
		return postCreateOperation(data);
	});
