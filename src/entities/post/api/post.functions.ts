import { createServerFn } from "@tanstack/react-start";
import { postListHandler } from "./post-handlers";

export const postListServerFn = createServerFn({ method: "GET" }).handler(() =>
	postListHandler(),
);
