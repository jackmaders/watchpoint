import { createFileRoute } from "@tanstack/react-router";
import { postListServerFn } from "@/entities/post";
import { HomePage } from "@/pages/home";

export const Route = createFileRoute("/")({
	loader: () => postListServerFn(),
	component: HomeRoute,
});

function HomeRoute() {
	return <HomePage posts={Route.useLoaderData()} />;
}
