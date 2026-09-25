import { useSuspenseQuery } from "@tanstack/react-query";
import { Activity, Database, Eye, ShieldCheck } from "lucide-react";
import { type ReactNode, useCallback, useState } from "react";
import { postListQueryOptions } from "@/entities/post";
import { PostCreateForm } from "@/features/post-create/index.async";
import { SessionPanel } from "@/features/session-manage/index.async";
import { Badge } from "@/shared/ui/badge";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/shared/ui/card";
import { Separator } from "@/shared/ui/separator";
import type { VideoMarker } from "@/shared/video";
import type {
	CreateLessonRunnerContextOptions,
	LessonRunnerAnswer,
	LessonRunnerContext,
	LessonRunnerQuestion,
	LessonRunnerStatus,
	LessonRunnerTransition,
} from "@/widgets/lesson-runner";
import {
	createLessonRunnerContext,
	getNextUnansweredQuestion,
	transitionLessonRunner,
} from "@/widgets/lesson-runner";
import { PostFeed } from "@/widgets/post-feed";
import { VideoDemo } from "./video-demo";

const DEMO_QUESTIONS: readonly LessonRunnerQuestion[] = [
	{ id: "opening-read", timestampSeconds: 5 },
	{ id: "midpoint-check", timestampSeconds: 15 },
	{ id: "closing-read", timestampSeconds: 25 },
];

const DEMO_ANSWERS: readonly LessonRunnerAnswer[] = [];

const DEMO_LESSON_OPTIONS: CreateLessonRunnerContextOptions = {
	answers: DEMO_ANSWERS,
	questions: DEMO_QUESTIONS,
};

export function HomePage() {
	const { data: posts } = useSuspenseQuery(postListQueryOptions);
	const [lessonRunnerContext, setLessonRunnerContext] =
		useState<LessonRunnerContext>(() =>
			createLessonRunnerContext(DEMO_LESSON_OPTIONS),
		);
	const nextUnansweredQuestion = getNextUnansweredQuestion(lessonRunnerContext);
	const status: LessonRunnerStatus = lessonRunnerContext.status;
	const handleMarkerTrigger = useCallback((marker: VideoMarker) => {
		const transition: LessonRunnerTransition = {
			type: "marker",
			questionId: marker.id,
		};

		setLessonRunnerContext((context) =>
			transitionLessonRunner(context, transition),
		);
	}, []);

	return (
		<div className="min-h-screen bg-background">
			<header className="border-border/70 border-b">
				<div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-5 lg:px-8">
					<div className="flex items-center gap-3">
						<div className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
							<Eye aria-hidden="true" className="size-4" />
						</div>
						<div>
							<p className="font-semibold text-sm tracking-tight">watchpoint</p>
							<p className="font-mono text-muted-foreground text-xs uppercase tracking-brand">
								Signal desk
							</p>
						</div>
					</div>
					<Badge className="gap-1.5" variant="outline">
						<span className="size-1.5 rounded-full bg-emerald-500" />
						Workspace online
					</Badge>
				</div>
			</header>

			<main className="mx-auto max-w-6xl px-6 py-12 lg:px-8 lg:py-16">
				<section className="grid gap-12 lg:grid-cols-5 lg:items-start">
					<div className="pt-2 lg:col-span-3">
						<p className="font-mono text-primary text-xs uppercase tracking-eyebrow">
							A calmer control room
						</p>
						<h1 className="mt-5 max-w-3xl font-heading font-medium text-5xl tracking-display sm:text-6xl lg:text-7xl">
							Keep the important <span className="text-primary">signal</span> in
							sight.
						</h1>
						<p className="mt-6 max-w-xl text-lg text-muted-foreground leading-8">
							A small, focused workspace for the things worth watching. Built on
							TanStack Start, backed by D1, and ready for an authenticated team.
						</p>
						<div className="mt-10 grid max-w-xl grid-cols-2 gap-6 border-border/70 border-t pt-6 sm:grid-cols-3">
							<Metric label="Posts tracked" value={posts.length.toString()} />
							<Metric label="Storage" value="D1" />
							<Metric label="Auth" value="Ready" />
						</div>
					</div>
					<div className="lg:col-span-2">
						<SessionPanel />
					</div>
				</section>

				<section className="mt-16">
					<VideoDemo
						activeQuestionId={lessonRunnerContext.activeQuestionId}
						markers={lessonRunnerContext.questions}
						onMarkerTrigger={handleMarkerTrigger}
					/>
				</section>

				<section className="mt-8">
					<Card>
						<CardHeader>
							<CardDescription className="font-mono text-xs uppercase tracking-label">
								Runner contract
							</CardDescription>
							<CardTitle className="mt-2">Lesson Runner preview</CardTitle>
							<CardDescription>
								Video markers and runner state share the same Questions and
								context.
							</CardDescription>
						</CardHeader>
						<CardContent className="text-muted-foreground text-sm">
							Status: {status}. Active Question:{" "}
							{lessonRunnerContext.activeQuestionId ?? "none"}. Next unanswered
							Question: {nextUnansweredQuestion?.id ?? "none"}
						</CardContent>
					</Card>
				</section>

				<section className="mt-16 grid gap-6 lg:grid-cols-5">
					<Card className="lg:col-span-3">
						<CardHeader>
							<div className="flex flex-wrap items-start justify-between gap-4">
								<div>
									<CardDescription className="font-mono text-xs uppercase tracking-label">
										New signal
									</CardDescription>
									<CardTitle className="mt-2">Add a watchpoint</CardTitle>
								</div>
								<Badge variant="secondary">
									<Activity aria-hidden="true" className="size-3.5" />
									Live
								</Badge>
							</div>
							<CardDescription>
								Give the next thing you care about a name.
							</CardDescription>
						</CardHeader>
						<CardContent>
							<PostCreateForm />
							<Separator className="my-6" />
							<div className="flex items-center justify-between gap-4">
								<h2 className="font-semibold text-sm">Recent watchpoints</h2>
								<span className="font-mono text-muted-foreground text-xs">
									Posts in D1: {posts.length}
								</span>
							</div>
							<PostFeed posts={posts} />
						</CardContent>
					</Card>

					<Card className="bg-secondary/45 lg:col-span-2">
						<CardHeader>
							<CardDescription className="font-mono text-xs uppercase tracking-label">
								System posture
							</CardDescription>
							<CardTitle className="mt-2">Quietly accounted for.</CardTitle>
						</CardHeader>
						<CardContent>
							<ul className="space-y-5">
								<PostureItem
									icon={<Database aria-hidden="true" />}
									label="Data layer"
									value="Cloudflare D1"
								/>
								<PostureItem
									icon={<ShieldCheck aria-hidden="true" />}
									label="Identity"
									value="Better Auth"
								/>
								<PostureItem
									icon={<Activity aria-hidden="true" />}
									label="Interface"
									value="shadcn/ui"
								/>
							</ul>
						</CardContent>
					</Card>
				</section>
			</main>
		</div>
	);
}

function Metric({ label, value }: { label: string; value: string }) {
	return (
		<div>
			<p className="font-mono text-muted-foreground text-xs uppercase tracking-metric">
				{label}
			</p>
			<p className="mt-2 font-medium text-2xl tracking-tight">{value}</p>
		</div>
	);
}

function PostureItem({
	icon,
	label,
	value,
}: {
	icon: ReactNode;
	label: string;
	value: string;
}) {
	return (
		<li className="flex items-center gap-3">
			<div className="flex size-9 items-center justify-center rounded-lg bg-background text-primary shadow-sm [&_svg]:size-4">
				{icon}
			</div>
			<div>
				<p className="font-medium text-sm">{label}</p>
				<p className="text-muted-foreground text-sm">{value}</p>
			</div>
		</li>
	);
}
