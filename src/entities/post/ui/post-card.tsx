import type { PostSelecttSchema } from "../api/posts-handlers.server";

export function PostCard({ post }: { post: PostSelecttSchema }) {
	return (
		<li className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
			<span className="size-2 rounded-full bg-primary" />
			<span className="text-sm">{post.name}</span>
		</li>
	);
}
