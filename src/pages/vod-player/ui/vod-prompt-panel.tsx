import { cn } from "cn";

import { Badge } from "@/shared/ui/shadcn/badge";

import { formatTime } from "../model/format-time";
import type { VodCheckpoint } from "../model/vod-detail";

interface VodPromptPanelProps {
  activeCheckpoint: VodCheckpoint | null;
  onSelectOption: (optionIndex: number) => void;
  selectedOptionIndex: number | null;
}

function VodPromptPanel({
  activeCheckpoint,
  onSelectOption,
  selectedOptionIndex,
}: VodPromptPanelProps) {
  return (
    <aside
      aria-label="Checkpoint prompt"
      className="h-fit rounded-lg border p-4 lg:w-90 lg:shrink-0"
    >
      {activeCheckpoint ? (
        <ActiveCheckpointPrompt
          checkpoint={activeCheckpoint}
          onSelectOption={onSelectOption}
          selectedOptionIndex={selectedOptionIndex}
        />
      ) : (
        <IdlePromptState />
      )}
    </aside>
  );
}

function IdlePromptState() {
  return (
    <p className="text-sm text-muted-foreground">
      Play the video. Playback pauses automatically at each Checkpoint.
    </p>
  );
}

function ActiveCheckpointPrompt({
  checkpoint,
  onSelectOption,
  selectedOptionIndex,
}: {
  checkpoint: VodCheckpoint;
  onSelectOption: (optionIndex: number) => void;
  selectedOptionIndex: number | null;
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
        onSelectOption={onSelectOption}
        options={checkpoint.options}
        selectedOptionIndex={selectedOptionIndex}
      />
    </div>
  );
}

function PromptOptionList({
  onSelectOption,
  options,
  selectedOptionIndex,
}: {
  onSelectOption: (optionIndex: number) => void;
  options: readonly string[];
  selectedOptionIndex: number | null;
}) {
  return (
    <fieldset aria-label="Prompt options" className="space-y-2">
      {options.map((optionLabel, optionIndex) => {
        const isSelected = selectedOptionIndex === optionIndex;
        const stateClass = isSelected
          ? "border-primary bg-primary/10"
          : "border-border hover:bg-muted/60";

        return (
          <button
            key={optionLabel}
            aria-pressed={isSelected}
            className={cn(
              "w-full rounded-md border px-3 py-2 text-left text-sm transition",
              stateClass,
            )}
            type="button"
            onClick={() => {
              onSelectOption(optionIndex);
            }}
          >
            {optionLabel}
          </button>
        );
      })}
    </fieldset>
  );
}

export { VodPromptPanel };
