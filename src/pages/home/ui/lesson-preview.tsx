import type { ImportDemoLessonInput } from "@/entities/lesson";
import { useDemoConvertMutation } from "@/features/demo-convert";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/shared/ui/card";

const previewQuestion = {
	options: [
		{
			id: "option-sample-1",
			isCorrect: true,
			orderIndex: 0,
			text: "Disengage to high ground and stabilize resources",
		},
		{
			id: "option-sample-2",
			isCorrect: false,
			orderIndex: 1,
			text: "Force the fight into their ultimate zone",
		},
		{
			id: "option-sample-3",
			isCorrect: false,
			orderIndex: 2,
			text: "Split push without line of sight",
		},
	],
	prompt:
		"The enemy team just committed support ultimates. What is the optimal tactical rotation?",
	questionId: "question-sample-1",
	skillId: "skill-strategy",
	skillName: "Strategy",
	timestampSeconds: 72,
} satisfies ImportDemoLessonInput["answers"][number]["snapshot"];

const previewAnswer = {
	questionId: "question-sample-1",
	selectedOptionId: "option-sample-1",
	snapshot: previewQuestion,
	timeSpentSeconds: 8,
} satisfies ImportDemoLessonInput["answers"][number];

const previewImport = {
	answers: [previewAnswer],
	selectedSkillIds: ["skill-strategy"],
	vodId: "vod-sample-coaching-demo",
} satisfies ImportDemoLessonInput;

const previewSummary = {
	score: 1,
	totalQuestions: previewImport.answers.length,
};

export function LessonPreview() {
	const importDemo = useDemoConvertMutation(previewImport);

	return (
		<Card>
			<CardHeader>
				<div className="flex flex-wrap items-start justify-between gap-4">
					<div>
						<CardDescription className="font-mono text-xs uppercase tracking-label">
							Lesson workflow
						</CardDescription>
						<CardTitle className="mt-2">A short lesson, end to end.</CardTitle>
					</div>
					<Badge variant="outline">Seeded sample</Badge>
				</div>
				<CardDescription>
					Explore the lesson flow, or import a completed sample to your account.
				</CardDescription>
			</CardHeader>
			<CardContent>
				<div className="grid gap-6 border-border/70 border-t pt-6 sm:grid-cols-2 lg:grid-cols-4">
					<PreviewMetric
						label="Skills selected"
						value={previewImport.selectedSkillIds.length.toString()}
					/>
					<PreviewMetric
						label="Options in question"
						value={previewQuestion.options.length.toString()}
					/>
					<PreviewMetric
						label="Answer result"
						value={
							previewQuestion.options.find(
								(option) => option.id === previewAnswer.selectedOptionId,
							)?.isCorrect
								? "Correct"
								: "Try again"
						}
					/>
					<PreviewMetric
						label="Completed score"
						value={`${importDemo.data?.score ?? previewSummary.score}/${importDemo.data?.totalQuestions ?? previewSummary.totalQuestions}`}
					/>
				</div>
				<div className="mt-6 flex flex-wrap items-center gap-4">
					<Button
						disabled={importDemo.isPending || importDemo.isSuccess}
						onClick={() => importDemo.mutate()}
					>
						{importDemo.isPending
							? "Importing sample..."
							: importDemo.isSuccess
								? "Sample lesson imported"
								: "Import sample lesson"}
					</Button>
					{importDemo.data ? (
						<p className="text-muted-foreground text-sm" role="status">
							Saved to your account: {importDemo.data.score}/
							{importDemo.data.totalQuestions} correct.
						</p>
					) : null}
					{importDemo.isError ? (
						<p className="text-destructive text-sm" role="alert">
							Could not import. Sign in and check that the demo content is
							seeded, then try again.
						</p>
					) : null}
				</div>
			</CardContent>
		</Card>
	);
}

function PreviewMetric({ label, value }: { label: string; value: string }) {
	return (
		<div>
			<p className="font-mono text-muted-foreground text-xs uppercase tracking-metric">
				{label}
			</p>
			<p className="mt-2 font-medium text-2xl tracking-tight">{value}</p>
		</div>
	);
}
