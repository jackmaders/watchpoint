import { Link } from "@tanstack/react-router";
import { cn } from "cn";

import { Badge } from "@/shared/ui/shadcn/badge";
import { Button, buttonVariants } from "@/shared/ui/shadcn/button";

import { formatTime } from "../model/format-time";
import type { CheckpointAnswer } from "../model/use-vod-player-session";
import type { VodCheckpoint } from "../model/vod-detail";

interface VodPromptPanelProps {
  activeAnswer: CheckpointAnswer | null;
  activeCheckpoint: VodCheckpoint | null;
  correctCount: number;
  isSessionComplete: boolean;
  onResetSession: () => void;
  onResumeVod: () => void;
  onSelectOption: (optionIndex: number) => void;
  totalCheckpoints: number;
}

function VodPromptPanel({
  activeAnswer,
  activeCheckpoint,
  correctCount,
  isSessionComplete,
  onResetSession,
  onResumeVod,
  onSelectOption,
  totalCheckpoints,
}: VodPromptPanelProps) {
  return (
    <aside
      aria-label="Checkpoint prompt"
      className="h-fit rounded-lg border p-4 lg:w-90 lg:shrink-0"
    >
      {renderPromptPanelBody({
        activeAnswer,
        activeCheckpoint,
        correctCount,
        isSessionComplete,
        onResetSession,
        onResumeVod,
        onSelectOption,
        totalCheckpoints,
      })}
    </aside>
  );
}

function renderPromptPanelBody({
  activeAnswer,
  activeCheckpoint,
  correctCount,
  isSessionComplete,
  onResetSession,
  onResumeVod,
  onSelectOption,
  totalCheckpoints,
}: VodPromptPanelProps) {
  if (activeCheckpoint) {
    return (
      <ActiveCheckpointPrompt
        answer={activeAnswer}
        checkpoint={activeCheckpoint}
        onResumeVod={onResumeVod}
        onSelectOption={onSelectOption}
      />
    );
  }

  if (isSessionComplete) {
    return (
      <SessionCompletionSummary
        correctCount={correctCount}
        onResetSession={onResetSession}
        totalCheckpoints={totalCheckpoints}
      />
    );
  }

  if (totalCheckpoints === 0) {
    return <p className="text-sm text-muted-foreground">This VOD has no Checkpoints to review.</p>;
  }

  return <IdlePromptState />;
}

function IdlePromptState() {
  return (
    <p className="text-sm text-muted-foreground">
      Play the video. Playback pauses automatically at each Checkpoint.
    </p>
  );
}

function SessionCompletionSummary({
  correctCount,
  onResetSession,
  totalCheckpoints,
}: {
  correctCount: number;
  onResetSession: () => void;
  totalCheckpoints: number;
}) {
  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <p className="text-sm font-semibold">Session complete</p>
        <p className="text-2xl font-bold">{`${correctCount} / ${totalCheckpoints} correct`}</p>
        <p className="text-xs text-muted-foreground">
          Click any Checkpoint pill to review your answer, or reset to try again.
        </p>
      </div>
      <div className="flex flex-col gap-2">
        <Button className="w-full" type="button" onClick={onResetSession}>
          Reset Session
        </Button>
        <Link className={buttonVariants({ className: "w-full", variant: "outline" })} to="/vods">
          Back to Catalogue
        </Link>
      </div>
    </div>
  );
}

function ActiveCheckpointPrompt({
  answer,
  checkpoint,
  onResumeVod,
  onSelectOption,
}: {
  answer: CheckpointAnswer | null;
  checkpoint: VodCheckpoint;
  onResumeVod: () => void;
  onSelectOption: (optionIndex: number) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Badge variant="secondary">{checkpoint.skillCategory}</Badge>
        <span className="font-mono text-xs text-muted-foreground">
          {formatTime(checkpoint.timeSec)}
        </span>
      </div>
      <p className="text-sm font-medium">{checkpoint.question}</p>
      <PromptOptionList
        answer={answer}
        correctOptionIndex={checkpoint.correctOptionIndex}
        options={checkpoint.options}
        onSelectOption={onSelectOption}
      />
      {answer ? (
        <PromptFeedback
          answer={answer}
          correctAnswer={checkpoint.options[checkpoint.correctOptionIndex] ?? ""}
          explanation={checkpoint.explanation}
          selectedAnswer={checkpoint.options[answer.selectedOptionIndex] ?? ""}
        />
      ) : null}
      {answer ? (
        <Button className="w-full" type="button" onClick={onResumeVod}>
          Resume VOD
        </Button>
      ) : null}
    </div>
  );
}

function PromptOptionList({
  answer,
  correctOptionIndex,
  onSelectOption,
  options,
}: {
  answer: CheckpointAnswer | null;
  correctOptionIndex: number;
  onSelectOption: (optionIndex: number) => void;
  options: readonly string[];
}) {
  const isAnswered = answer !== null;

  return (
    <fieldset aria-label="Prompt options" className="space-y-2">
      {options.map((optionLabel, optionIndex) => {
        const isSelected = answer?.selectedOptionIndex === optionIndex;
        const isCorrectOption = optionIndex === correctOptionIndex;

        return (
          <button
            key={optionLabel}
            aria-pressed={isSelected}
            className={cn(
              "w-full rounded-md border px-3 py-2 text-left text-sm transition outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
              getOptionStateClass({ isAnswered, isCorrectOption, isSelected }),
            )}
            aria-disabled={isAnswered}
            type="button"
            onClick={() => {
              if (!isAnswered) {
                onSelectOption(optionIndex);
              }
            }}
          >
            {optionLabel}
          </button>
        );
      })}
    </fieldset>
  );
}

function PromptFeedback({
  answer,
  correctAnswer,
  explanation,
  selectedAnswer,
}: {
  answer: CheckpointAnswer;
  correctAnswer: string;
  explanation: string;
  selectedAnswer: string;
}) {
  return (
    <div className="rounded-md border bg-muted/40 p-3 text-sm">
      <p className="font-semibold">{answer.isCorrect ? "Correct" : "Incorrect"}</p>
      <p className="mt-1">
        <span className="font-semibold">Correct answer:</span> {correctAnswer}
      </p>
      <p className="mt-1">
        <span className="font-semibold">Your answer:</span> {selectedAnswer}
      </p>
      <p className="mt-1 text-muted-foreground">{explanation}</p>
    </div>
  );
}

function getOptionStateClass({
  isAnswered,
  isCorrectOption,
  isSelected,
}: {
  isAnswered: boolean;
  isCorrectOption: boolean;
  isSelected: boolean;
}): string {
  if (!isAnswered) {
    return "border-border hover:bg-muted/60";
  }
  if (isCorrectOption) {
    return "border-success bg-success/10 text-success";
  }
  if (isSelected) {
    return "border-destructive bg-destructive/10";
  }
  return "border-border opacity-70";
}

export { VodPromptPanel };
