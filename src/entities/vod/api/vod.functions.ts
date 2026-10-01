import { createServerFn } from "@tanstack/react-start";
import { z } from "zod/v4";
import { getSession } from "@/shared/auth/index.server";
import {
	getDemoVodHandler,
	getVodLessonAccessHandler,
	publishedVodListHandler,
} from "./vod-handlers";

export const publishedVodListServerFn = createServerFn({
	method: "GET",
}).handler(() => publishedVodListHandler());

export const demoVodServerFn = createServerFn({
	method: "GET",
}).handler(() => getDemoVodHandler());

export const vodLessonAccessServerFn = createServerFn({
	method: "GET",
})
	.validator(
		z.object({
			vodId: z.string(),
			returnTo: z.string().optional(),
		}),
	)
	.handler(async ({ data }) => {
		const session = await getSession();
		return getVodLessonAccessHandler({
			vodId: data.vodId,
			session,
			returnTo: data.returnTo,
		});
	});
