import { createFileRoute, notFound, redirect } from "@tanstack/react-router";
import { vodLessonAccessServerFn } from "@/entities/vod";

export const Route = createFileRoute("/vods/$vodId")({
	loader: async ({ params, location }) => {
		const access = await vodLessonAccessServerFn({
			data: {
				vodId: params.vodId,
				returnTo: location.href,
			},
		});

		if (access.status === "not-found") {
			throw notFound();
		}

		if (access.status === "redirect") {
			throw redirect({
				to: access.to,
				search: {
					returnTo: access.returnTo,
				},
			});
		}

		return {
			vod: access.vod,
			mode: access.mode,
		};
	},
	component: VodLessonRouteComponent,
});

function VodLessonRouteComponent() {
	const { vod, mode } = Route.useLoaderData();

	return (
		<main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-4 p-8">
			<p className="font-mono text-muted-foreground text-xs uppercase tracking-brand">
				{mode === "demo" ? "Demo Lesson" : "Standard Lesson"}
			</p>
			<h1 className="font-heading font-medium text-4xl tracking-tight">
				{vod.title}
			</h1>
			<p className="max-w-xl text-muted-foreground">
				Interactive Lesson player.
			</p>
		</main>
	);
}
