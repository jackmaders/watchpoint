import { createFileRoute, notFound } from "@tanstack/react-router";
import { demoVodServerFn } from "@/entities/vod";

export const Route = createFileRoute("/demo")({
	loader: async () => {
		const demoVod = await demoVodServerFn();
		if (!demoVod) {
			throw notFound();
		}
		return { demoVod };
	},
	component: DemoLessonPage,
});

function DemoLessonPage() {
	const { demoVod } = Route.useLoaderData();

	return (
		<main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-4 p-8">
			<p className="font-mono text-muted-foreground text-xs uppercase tracking-brand">
				Demo Lesson
			</p>
			<h1 className="font-heading font-medium text-4xl tracking-tight">
				{demoVod.title}
			</h1>
			<p className="max-w-xl text-muted-foreground">
				Interactive demo Lesson preview.
			</p>
		</main>
	);
}
