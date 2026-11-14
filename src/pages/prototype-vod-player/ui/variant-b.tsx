import { Badge } from "@/shared/ui/shadcn/badge";
import { Button } from "@/shared/ui/shadcn/button";

import {
  formatTime,
  type PrototypeVod,
  type usePrototypeVodPlayer,
} from "../model/prototype-vod-data";

interface VariantProps {
  vod: PrototypeVod;
  player: ReturnType<typeof usePrototypeVodPlayer>;
}

/**
 * Variant B — Cinema Theater (minimal layout) Top: Full-width 16:9 player. Middle: Checkpoint row.
 * Bottom: Wide 2-column Prompt.
 */
export function VariantB({ vod, player }: VariantProps) {
  const active = player.activeCheckpoint;
  const submitted = active ? player.answers[active.id] : undefined;

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <h1 className="text-lg font-semibold">{vod.title}</h1>

      <div className="aspect-video w-full overflow-hidden rounded-lg border bg-black">
        <div ref={player.playerHostRef} className="size-full" />
      </div>

      <div className="grid grid-cols-4 gap-2">
        {vod.checkpoints.map((cp) => {
          const record = player.answers[cp.id];
          const isActive = active?.id === cp.id;
          return (
            <Button
              key={cp.id}
              type="button"
              variant={isActive ? "default" : "outline"}
              className="justify-between"
              onClick={() => player.jumpToCheckpoint(cp.id)}
            >
              <span className="font-mono text-xs">{formatTime(cp.timeSec)}</span>
              <span className="text-xs">{cp.skillCategory}</span>
              {record && <span>{record.isCorrect ? "✓" : "✕"}</span>}
            </Button>
          );
        })}
      </div>

      <div className="rounded-lg border p-4">
        {!active ? (
          <p className="text-sm text-muted-foreground">
            Play the video. Playback pauses automatically at each Checkpoint.
          </p>
        ) : (
          <div className="grid gap-6 md:grid-cols-[1fr_1.2fr]">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Badge variant="secondary">{active.skillCategory}</Badge>
                <span className="font-mono text-xs text-muted-foreground">
                  {formatTime(active.timeSec)}
                </span>
              </div>
              <p className="text-sm font-medium">{active.question}</p>

              {submitted && (
                <div className="rounded-md border bg-muted/40 p-3 text-sm">
                  <p className="font-semibold">{submitted.isCorrect ? "Correct" : "Incorrect"}</p>
                  <p className="mt-1 text-muted-foreground">{active.explanation}</p>
                </div>
              )}
            </div>

            <div className="flex flex-col justify-between gap-3">
              <div className="grid gap-2 sm:grid-cols-2">
                {active.options.map((opt) => {
                  const isSelected =
                    (submitted?.selectedOptionId ?? player.draftOptionId) === opt.id;
                  const isCorrectOption = opt.id === active.correctOptionId;

                  let stateClass = "border-border hover:bg-muted/60";
                  if (submitted) {
                    if (isCorrectOption) {
                      stateClass = "border-emerald-500 bg-emerald-500/10";
                    } else if (isSelected) {
                      stateClass = "border-destructive bg-destructive/10";
                    }
                  } else if (isSelected) {
                    stateClass = "border-primary bg-primary/10";
                  }

                  return (
                    <button
                      key={opt.id}
                      type="button"
                      disabled={Boolean(submitted)}
                      onClick={() => player.setDraftOptionId(opt.id)}
                      className={`rounded-md border p-3 text-left text-sm transition ${stateClass}`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>

              <div className="flex justify-end">
                {!submitted ? (
                  <Button
                    type="button"
                    disabled={!player.draftOptionId}
                    onClick={player.submitAnswer}
                  >
                    Submit Answer
                  </Button>
                ) : (
                  <Button type="button" onClick={player.resumeVod}>
                    Resume VOD
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
