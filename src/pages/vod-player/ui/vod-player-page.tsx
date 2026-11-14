import { useSuspenseQuery } from "@tanstack/react-query";
import type { RefObject } from "react";

import { Button } from "@/shared/ui/shadcn/button";

import { vodDetailQueryOptions } from "../api/vod-detail-query-options";
import { formatTime } from "../model/format-time";
import { useVodPlayerSession } from "../model/use-vod-player-session";
import type { VodCheckpoint, VodDetail } from "../model/vod-detail";
import { VodPromptPanel } from "./vod-prompt-panel";

interface VodPlayerPageProps {
  vodId: string;
}

interface VodPlayerColumnProps {
  activeCheckpointId: string | null;
  checkpoints: readonly VodCheckpoint[];
  onSelectCheckpoint: (checkpoint: VodCheckpoint) => void;
  playerHostRef: RefObject<HTMLDivElement | null>;
}

interface CheckpointPillStripProps {
  activeCheckpointId: string | null;
  checkpoints: readonly VodCheckpoint[];
  onSelectCheckpoint: (checkpoint: VodCheckpoint) => void;
}

function VodPlayerPage({ vodId }: VodPlayerPageProps) {
  const { data: vod } = useSuspenseQuery(vodDetailQueryOptions(vodId));

  return <VodPlayerStudio key={vod.id} vod={vod} />;
}

function VodPlayerStudio({ vod }: { vod: VodDetail }) {
  const { activeCheckpoint, playerHostRef, selectCheckpoint, selectOption, selectedOptionIndex } =
    useVodPlayerSession({
      checkpoints: vod.checkpoints,
      youtubeVideoId: vod.youtubeVideoId,
    });

  return (
    <section className="space-y-4">
      <h1 className="text-lg font-semibold">{vod.title}</h1>
      <div className="flex flex-col gap-6 lg:flex-row">
        <VodPlayerColumn
          activeCheckpointId={activeCheckpoint?.id ?? null}
          checkpoints={vod.checkpoints}
          onSelectCheckpoint={selectCheckpoint}
          playerHostRef={playerHostRef}
        />
        <VodPromptPanel
          activeCheckpoint={activeCheckpoint}
          onSelectOption={selectOption}
          selectedOptionIndex={selectedOptionIndex}
        />
      </div>
    </section>
  );
}

function VodPlayerColumn({
  activeCheckpointId,
  checkpoints,
  onSelectCheckpoint,
  playerHostRef,
}: VodPlayerColumnProps) {
  return (
    <div className="space-y-3 lg:flex-1">
      <section
        aria-label="VOD player"
        className="aspect-video w-full overflow-hidden rounded-lg border bg-black"
      >
        <div ref={playerHostRef} className="size-full" />
      </section>
      <CheckpointPillStrip
        activeCheckpointId={activeCheckpointId}
        checkpoints={checkpoints}
        onSelectCheckpoint={onSelectCheckpoint}
      />
    </div>
  );
}

function CheckpointPillStrip({
  activeCheckpointId,
  checkpoints,
  onSelectCheckpoint,
}: CheckpointPillStripProps) {
  return (
    <fieldset aria-label="Checkpoints" className="flex flex-wrap gap-2">
      {checkpoints.map((checkpoint) => {
        const isActive = activeCheckpointId === checkpoint.id;
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
          </Button>
        );
      })}
    </fieldset>
  );
}

export { VodPlayerPage };
