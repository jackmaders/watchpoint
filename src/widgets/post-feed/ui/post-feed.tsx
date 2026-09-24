import type { Post } from "@/entities/post";
import { PostCard } from "@/entities/post";

export function PostFeed({ posts }: { posts: Post[] }) {
	if (posts.length === 0) {
		return (
			<p className="mt-4 text-muted-foreground text-sm">No watchpoints yet.</p>
		);
	}

	return (
		<ul className="mt-4 divide-y divide-border/70">
			{posts.map((post) => (
				<PostCard key={post.id} post={post} />
			))}
		</ul>
	);
}
