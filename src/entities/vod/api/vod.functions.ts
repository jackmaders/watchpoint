import { createServerFn } from "@tanstack/react-start";
import { publishedVodListHandler } from "./vod-handlers";

export const publishedVodListServerFn = createServerFn({
	method: "GET",
}).handler(() => publishedVodListHandler());
