import { createServerFn } from "@tanstack/react-start";
import { postInsertSchema } from "@/entities/post";
import { postCreateOperation } from "@/entities/post/index.server";
import { ensureSession } from "@/shared/auth-server";

export const postCreateServerFn = createServerFn({ method: "POST" })
	.validator(postInsertSchema)
	.handler(async ({ data }) => {
		await ensureSession();
		return postCreateOperation(data);
	});
