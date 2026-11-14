import { cn } from "cn";
import type { ComponentProps } from "react";

import type { SkillCategory } from "@/shared/db";
import { Badge } from "@/shared/ui/shadcn/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/shadcn/card";

import type { VodCatalogueItem } from "../model/vod-catalogue";

interface VodCardProps extends Omit<ComponentProps<typeof Card>, "children"> {
  vod: VodCatalogueItem;
}

function VodCard({ className, vod, ...props }: VodCardProps) {
  return (
    <Card className={cn("relative h-full", className)} {...props}>
      <img
        alt={vod.title}
        className="aspect-video w-full object-cover"
        loading="lazy"
        src={`https://i.ytimg.com/vi/${vod.youtubeVideoId}/hqdefault.jpg`}
      />
      <VodCardBody vod={vod} />
    </Card>
  );
}

function VodCardBody({ vod }: { vod: VodCatalogueItem }) {
  return (
    <>
      <CardHeader className="gap-2">
        <VodCardMeta checkpointCount={vod.checkpointCount} tier={vod.tier} />
        <VodCardTitle id={vod.id} title={vod.title} />
        <CardDescription>
          {vod.hero} ({vod.role}) · {vod.map}
        </CardDescription>
      </CardHeader>
      <VodCardSkills skillCategories={vod.skillCategories} />
    </>
  );
}

function VodCardMeta({
  checkpointCount,
  tier,
}: {
  checkpointCount: number;
  tier: VodCatalogueItem["tier"];
}) {
  const checkpointLabel = checkpointCount === 1 ? "Checkpoint" : "Checkpoints";

  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <Badge variant="outline">{tier}</Badge>
      <span className="text-xs text-muted-foreground">
        {checkpointCount} {checkpointLabel}
      </span>
    </div>
  );
}

function VodCardTitle({ id, title }: { id: string; title: string }) {
  return (
    <CardTitle>
      <h2>
        <a
          className="line-clamp-2 after:absolute after:inset-0 hover:underline focus-visible:underline focus-visible:outline-none"
          href={`/vods/${id}`}
        >
          {title}
        </a>
      </h2>
    </CardTitle>
  );
}

function VodCardSkills({ skillCategories }: { skillCategories: readonly SkillCategory[] }) {
  if (skillCategories.length === 0) {
    return null;
  }

  return (
    <CardContent className="mt-auto flex flex-wrap gap-1.5">
      {skillCategories.map((category) => (
        <Badge key={category} variant="secondary">
          {category}
        </Badge>
      ))}
    </CardContent>
  );
}

export { VodCard };
