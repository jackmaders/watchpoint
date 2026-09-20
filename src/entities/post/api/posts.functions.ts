import { createServerFn } from "@tanstack/react-start";
import { getPostsRecord } from "./posts.server";

export const getPosts = createServerFn().handler(() => getPostsRecord());
