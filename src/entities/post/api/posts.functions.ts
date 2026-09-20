import { createServerFn } from "@tanstack/react-start";
import { postListOperation } from "./posts.server";

export const postListServerFn = createServerFn().handler(() =>
	postListOperation(),
);
