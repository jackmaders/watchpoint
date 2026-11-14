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
 * Variant A — Studio Split (minimal layout) Left: 16:9 player + Checkpoint pills below. Right:
 * Prompt panel.
 */
export function VariantA({ vod, player }: VariantProps) {
  const active = player.activeCheckpoint;
  const submitted = active ? player.answers[active.id] : undefined;

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold">{vod.title}</h1>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-3">
          <div className="aspect-video w-full overflow-hidden rounded-lg border bg-black">
            <div ref={player.playerHostRef} className="size-full" />
          </div>

          <div className="flex flex-wrap gap-2">
            {vod.checkpoints.map((cp) => {
              const record = player.answers[cp.id];
              const isActive = active?.id === cp.id;
              return (
                <Button
                  key={cp.id}
                  type="button"
                  size="sm"
                  variant={isActive ? "default" : "outline"}
                  onClick={() => player.jumpToCheckpoint(cp.id)}
                >
                  <span className="font-mono text-xs">{formatTime(cp.timeSec)}</span>
                  {record && <span>{record.isCorrect ? "✓" : "✕"}</span>}
                </Button>
              );
            })}
          </div>
        </div>

        <div className="h-fit rounded-lg border p-4">
          {!active ? (
            <p className="text-sm text-muted-foreground">
              Play the video. Playback pauses automatically at each Checkpoint.
            </p>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Badge variant="secondary">{active.skillCategory}</Badge>
                <span className="font-mono text-xs text-muted-foreground">
                  {formatTime(active.timeSec)}
                </span>
              </div>

              <p className="text-sm font-medium">{active.question}</p>

              <div className="space-y-2">
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
                      className={`w-full rounded-md border px-3 py-2 text-left text-sm transition ${stateClass}`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>

              {submitted && (
                <div className="rounded-md border bg-muted/40 p-3 text-sm">
                  <p className="font-semibold">{submitted.isCorrect ? "Correct" : "Incorrect"}</p>
                  <p className="mt-1 text-muted-foreground">{active.explanation}</p>
                </div>
              )}

              {!submitted ? (
                <Button
                  type="button"
                  className="w-full"
                  disabled={!player.draftOptionId}
                  onClick={player.submitAnswer}
                >
                  Submit Answer
                </Button>
              ) : (
                <Button type="button" className="w-full" onClick={player.resumeVod}>
                  Resume VOD
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
