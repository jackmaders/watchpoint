import { useSuspenseQuery } from "@tanstack/react-query";
import type { RefObject } from "react";

import { Button } from "@/shared/ui/shadcn/button";

import { vodDetailQueryOptions } from "../api/vod-detail-query-options";
import { formatTime } from "../model/format-time";
import {
  type CheckpointAnswer,
  useVodPlayerSession,
  type VodPlayerFatalError,
} from "../model/use-vod-player-session";
import type { VodCheckpoint, VodDetail } from "../model/vod-detail";
import { VodPlayerErrorCard } from "./vod-player-error-card";
import { VodPromptPanel } from "./vod-prompt-panel";

interface VodPlayerPageProps {
  vodId: string;
}

interface VodPlayerColumnProps {
  activeCheckpointId: string | null;
  answers: ReadonlyMap<string, CheckpointAnswer>;
  checkpoints: readonly VodCheckpoint[];
  onSelectCheckpoint: (checkpoint: VodCheckpoint) => void;
  playerError: VodPlayerFatalError | null;
  playerHostRef: RefObject<HTMLDivElement | null>;
  youtubeVideoId: string;
}

interface CheckpointPillStripProps {
  activeCheckpointId: string | null;
  answers: ReadonlyMap<string, CheckpointAnswer>;
  checkpoints: readonly VodCheckpoint[];
  onSelectCheckpoint: (checkpoint: VodCheckpoint) => void;
}

function VodPlayerPage({ vodId }: VodPlayerPageProps) {
  const { data: vod } = useSuspenseQuery(vodDetailQueryOptions(vodId));

  return <VodPlayerStudio key={vod.id} vod={vod} />;
}

function VodPlayerStudio({ vod }: { vod: VodDetail }) {
  const {
    activeAnswer,
    activeCheckpoint,
    answers,
    playerError,
    playerHostRef,
    resetSession,
    resumeVod,
    selectCheckpoint,
    selectOption,
  } = useVodPlayerSession({
    checkpoints: vod.checkpoints,
    youtubeVideoId: vod.youtubeVideoId,
  });
  const totalCheckpoints = vod.checkpoints.length;
  const correctCount = vod.checkpoints.filter(
    (checkpoint) => answers.get(checkpoint.id)?.isCorrect === true,
  ).length;
  const isSessionComplete =
    totalCheckpoints > 0 && vod.checkpoints.every((checkpoint) => answers.has(checkpoint.id));

  return (
    <section className="space-y-4">
      <h1 className="text-lg font-semibold">{vod.title}</h1>
      <div className="flex flex-col gap-6 lg:flex-row">
        <VodPlayerColumn
          activeCheckpointId={activeCheckpoint?.id ?? null}
          answers={answers}
          checkpoints={vod.checkpoints}
          onSelectCheckpoint={selectCheckpoint}
          playerError={playerError}
          playerHostRef={playerHostRef}
          youtubeVideoId={vod.youtubeVideoId}
        />
        <VodPromptPanel
          activeAnswer={activeAnswer}
          activeCheckpoint={activeCheckpoint}
          correctCount={correctCount}
          isSessionComplete={isSessionComplete}
          onResetSession={resetSession}
          onResumeVod={resumeVod}
          onSelectOption={selectOption}
          totalCheckpoints={totalCheckpoints}
        />
      </div>
    </section>
  );
}

function VodPlayerColumn({
  activeCheckpointId,
  answers,
  checkpoints,
  onSelectCheckpoint,
  playerError,
  playerHostRef,
  youtubeVideoId,
}: VodPlayerColumnProps) {
  return (
    <div className="space-y-3 lg:min-w-0 lg:flex-1">
      {playerError === null ? (
        <section
          aria-label="VOD player"
          className="aspect-video w-full overflow-hidden rounded-lg border bg-black"
        >
          <div ref={playerHostRef} className="size-full" />
        </section>
      ) : (
        <VodPlayerErrorCard error={playerError} youtubeVideoId={youtubeVideoId} />
      )}
      <CheckpointPillStrip
        activeCheckpointId={activeCheckpointId}
        answers={answers}
        checkpoints={checkpoints}
        onSelectCheckpoint={onSelectCheckpoint}
      />
    </div>
  );
}

function CheckpointPillStrip({
  activeCheckpointId,
  answers,
  checkpoints,
  onSelectCheckpoint,
}: CheckpointPillStripProps) {
  if (checkpoints.length === 0) {
    return null;
  }

  return (
    <fieldset aria-label="Checkpoints" className="flex flex-wrap gap-2">
      {checkpoints.map((checkpoint) => {
        const isActive = activeCheckpointId === checkpoint.id;
        const statusSymbol = getCheckpointStatusSymbol(answers.get(checkpoint.id));

        return (
          <Button
            key={checkpoint.id}
            aria-pressed={isActive}
            size="sm"
            type="button"
            variant={isActive ? "default" : "outline"}
            onClick={() => {
              onSelectCheckpoint(checkpoint);
            }}
          >
            <span className="font-mono text-xs">{formatTime(checkpoint.timeSec)}</span>
            {statusSymbol === null ? null : <span>{statusSymbol}</span>}
          </Button>
        );
      })}
    </fieldset>
  );
}

function getCheckpointStatusSymbol(answer: CheckpointAnswer | undefined): string | null {
  if (!answer) {
    return null;
  }
  return answer.isCorrect ? "✓" : "✕";
}

export { VodPlayerPage };
