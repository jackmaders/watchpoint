import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect } from "react";

import { Button } from "./shadcn/button";

export interface PrototypeVariantOption<T extends string = string> {
  key: T;
  label: string;
}

interface PrototypeSwitcherProps<T extends string> {
  variants: ReadonlyArray<PrototypeVariantOption<T>>;
  current: T;
  onSelect: (variant: T) => void;
}

export function PrototypeSwitcher<T extends string>({
  variants,
  current,
  onSelect,
}: PrototypeSwitcherProps<T>) {
  if (!import.meta.env.DEV) {
    return null;
  }

  const currentIndex = Math.max(
    0,
    variants.findIndex((item) => item.key === current),
  );
  const active = variants[currentIndex] ?? variants[0];

  const cycle = (delta: -1 | 1) => {
    const nextIndex = (currentIndex + delta + variants.length) % variants.length;
    const next = variants[nextIndex];
    if (next) {
      onSelect(next.key);
    }
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)
      ) {
        return;
      }

      if (event.key === "ArrowLeft") {
        event.preventDefault();
        cycle(-1);
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        cycle(1);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  });

  return (
    <div
      data-slot="prototype-switcher"
      className="fixed bottom-4 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-full border border-border bg-foreground px-2 py-1.5 text-background shadow-lg"
    >
      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        aria-label="Previous prototype variant"
        className="rounded-full text-background hover:bg-background/15 hover:text-background"
        onClick={() => cycle(-1)}
      >
        <ChevronLeft className="size-4" />
      </Button>
      <span className="px-2 text-xs font-medium whitespace-nowrap">
        Variant {active?.key} ({active?.label})
      </span>
      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        aria-label="Next prototype variant"
        className="rounded-full text-background hover:bg-background/15 hover:text-background"
        onClick={() => cycle(1)}
      >
        <ChevronRight className="size-4" />
      </Button>
    </div>
  );
}
