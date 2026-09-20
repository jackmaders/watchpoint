import type { Post } from "../model/post.schema";

export function PostCard({ post }: { post: Post }) {
	return <li>{post.name}</li>;
}
