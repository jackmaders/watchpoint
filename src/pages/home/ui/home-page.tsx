import { PostCreateForm } from "@/features/post-create";
import { PostFeed } from "@/widgets/post-feed";

export function HomePage() {
	return (
		<div className="p-8">
			<h1 className="font-bold text-4xl">Welcome to TanStack Start</h1>
			<p className="mt-4 text-lg">
				Edit <code>src/app/routes/index.tsx</code> to get started.
			</p>

			<PostCreateForm />
			<PostFeed />
		</div>
	);
}
