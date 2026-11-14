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
 * Variant C — Tactical Rail (minimal layout) Left: Vertical Checkpoint rail. Center: 16:9 player.
 * Right: Prompt panel.
 */
export function VariantC({ vod, player }: VariantProps) {
  const active = player.activeCheckpoint;
  const submitted = active ? player.answers[active.id] : undefined;

  return (
    <div className="grid gap-4 lg:grid-cols-[200px_1fr_320px]">
      <aside className="space-y-1.5 rounded-lg border p-2">
        {vod.checkpoints.map((cp) => {
          const record = player.answers[cp.id];
          const isActive = active?.id === cp.id;
          return (
            <button
              key={cp.id}
              type="button"
              onClick={() => player.jumpToCheckpoint(cp.id)}
              className={`flex w-full items-center justify-between rounded-md px-2.5 py-2 text-left text-xs transition ${
                isActive ? "bg-primary text-primary-foreground" : "hover:bg-muted"
              }`}
            >
              <span className="font-mono">{formatTime(cp.timeSec)}</span>
              <span>{cp.skillCategory}</span>
              {record && <span>{record.isCorrect ? "✓" : "✕"}</span>}
            </button>
          );
        })}
      </aside>

      <div className="space-y-2">
        <h1 className="text-base font-semibold">{vod.title}</h1>
        <div className="aspect-video w-full overflow-hidden rounded-lg border bg-black">
          <div ref={player.playerHostRef} className="size-full" />
        </div>
      </div>

      <div className="h-fit rounded-lg border p-4">
        {!active ? (
          <p className="text-sm text-muted-foreground">
            Play the video. Playback pauses automatically at each Checkpoint.
          </p>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Badge variant="secondary">{active.skillCategory}</Badge>
              <span className="font-mono text-xs text-muted-foreground">
                {formatTime(active.timeSec)}
              </span>
            </div>

            <p className="text-sm font-medium">{active.question}</p>

            <div className="space-y-2">
              {active.options.map((opt) => {
                const isSelected = (submitted?.selectedOptionId ?? player.draftOptionId) === opt.id;
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
                    className={`w-full rounded-md border px-3 py-2 text-left text-xs transition ${stateClass}`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>

            {submitted && (
              <div className="rounded-md border bg-muted/40 p-2.5 text-xs">
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
  );
}
