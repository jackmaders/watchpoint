// Three variants of the Watchpoint interactive VOD checkpoint player, switchable via ?variant=, on the throwaway /prototype/vod-player route.
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { z } from "zod";

import {
  PROTOTYPE_VOD,
  usePrototypeVodPlayer,
} from "@/pages/prototype-vod-player/model/prototype-vod-data";
import { VariantA } from "@/pages/prototype-vod-player/ui/variant-a";
import { VariantB } from "@/pages/prototype-vod-player/ui/variant-b";
import { VariantC } from "@/pages/prototype-vod-player/ui/variant-c";
import { PrototypeSwitcher, type PrototypeVariantOption } from "@/shared/ui/prototype-switcher";

const variantSchema = z.object({
  variant: z.enum(["A", "B", "C"]).optional().default("A"),
});

type VariantKey = "A" | "B" | "C";

const VARIANTS: ReadonlyArray<PrototypeVariantOption<VariantKey>> = [
  { key: "A", label: "Studio Split" },
  { key: "B", label: "Cinema Theater + Deck" },
  { key: "C", label: "Tactical Rail + Drawer" },
];

export const Route = createFileRoute("/prototype/vod-player")({
  validateSearch: (search) => variantSchema.parse(search),
  component: PrototypeVodPlayerRoute,
});

function PrototypeVodPlayerRoute() {
  const { variant } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const player = usePrototypeVodPlayer(PROTOTYPE_VOD);

  const handleSelectVariant = (next: VariantKey) => {
    void navigate({
      search: { variant: next },
      replace: true,
    });
  };

  return (
    <div className="space-y-8 pb-20">
      <div className="rounded-lg border border-dashed border-amber-500/50 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-300">
        <strong>PROTOTYPE (throwaway):</strong> Switch variants via <code>?variant=A|B|C</code> or
        the bottom bar (<code>←</code> / <code>→</code>).
      </div>

      {variant === "A" && <VariantA vod={PROTOTYPE_VOD} player={player} />}
      {variant === "B" && <VariantB vod={PROTOTYPE_VOD} player={player} />}
      {variant === "C" && <VariantC vod={PROTOTYPE_VOD} player={player} />}

      <details className="rounded-lg border bg-muted/30 p-3 text-xs">
        <summary className="cursor-pointer font-medium">
          Prototype State Readout (playerReady={String(player.playerReady)}, isPlaying=
          {String(player.isPlaying)}, currentTime={player.currentTimeSec.toFixed(1)}s)
        </summary>
        <pre className="mt-2 overflow-x-auto text-[11px]">
          {JSON.stringify(
            {
              variant,
              activeCheckpointId: player.activeCheckpoint?.id ?? null,
              draftOptionId: player.draftOptionId,
              answers: player.answers,
            },
            null,
            2,
          )}
        </pre>
      </details>

      <PrototypeSwitcher variants={VARIANTS} current={variant} onSelect={handleSelectVariant} />
    </div>
  );
}
