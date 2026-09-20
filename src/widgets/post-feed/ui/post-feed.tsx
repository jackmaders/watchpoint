import { useSuspenseQuery } from "@tanstack/react-query";
import { useId } from "react";
import { PostCard, postsQueryOptions } from "@/entities/post";

export function PostFeed() {
	const headingId = useId();
	const { data: posts } = useSuspenseQuery(postsQueryOptions);

	return (
		<section aria-labelledby={headingId} className="mt-8">
			<h2 className="font-bold text-2xl" id={headingId}>
				Posts
			</h2>
			<p>Posts in D1: {posts.length}</p>
			{posts.length > 0 ? (
				<ul>
					{posts.map((post) => (
						<PostCard key={post.id} post={post} />
					))}
				</ul>
			) : (
				<p>No posts yet.</p>
			)}
		</section>
	);
}
