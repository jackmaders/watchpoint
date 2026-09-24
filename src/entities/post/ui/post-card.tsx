import type { PostSelectSchema } from "../model/types";

export function PostCard({ post }: { post: PostSelectSchema }) {
	return (
		<li className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
			<span className="size-2 rounded-full bg-primary" />
			<span className="text-sm">{post.name}</span>
		</li>
	);
}
