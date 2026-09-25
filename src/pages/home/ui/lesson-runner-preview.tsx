import { type Dispatch, useCallback, useReducer } from "react";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/shared/ui/card";
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
import { VideoDemo } from "./video-demo";

export function LessonRunnerPreview() {
	const [lessonRunnerContext, dispatch]: [
		LessonRunnerContext,
		Dispatch<LessonRunnerTransition>,
	] = useReducer(
		transitionLessonRunner,
		DEMO_LESSON_OPTIONS,
		createLessonRunnerContext,
	);
	const nextUnansweredQuestion = getNextUnansweredQuestion(lessonRunnerContext);
	const status: LessonRunnerStatus = lessonRunnerContext.status;
	const handleMarkerTrigger = useCallback((marker: VideoMarker) => {
		const transition: LessonRunnerTransition = {
			type: "marker",
			questionId: marker.id,
		};

		dispatch(transition);
	}, []);

	return (
		<>
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
							Question Markers activate Questions in this preview; runner state
							drives the readout.
						</CardDescription>
					</CardHeader>
					<CardContent className="text-muted-foreground text-sm">
						Status: {status}. Active Question:{" "}
						{lessonRunnerContext.activeQuestionId ?? "none"}. Next unanswered
						Question: {nextUnansweredQuestion?.id ?? "none"}
					</CardContent>
				</Card>
			</section>
		</>
	);
}

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
