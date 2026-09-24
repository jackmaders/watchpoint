import { createServerFn } from "@tanstack/react-start";
import { postListHandler } from "./posts-handlers.server";

export const postListServerFn = createServerFn({ method: "GET" }).handler(() =>
	postListHandler(),
);
