import { Link } from "@tanstack/react-router";

import { buttonVariants } from "@/shared/ui/shadcn/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/shadcn/card";

import type { VodPlayerFatalError } from "../model/use-vod-player-session";

const PLAYER_ERROR_COPY: Record<VodPlayerFatalError, { description: string; title: string }> = {
  EMBED_DISABLED: {
    description:
      "The video owner disabled playback outside YouTube. Watch directly on YouTube or return to the catalogue.",
    title: "Embedding disabled for this video",
  },
  NOT_FOUND: {
    description:
      "This YouTube video is private, removed, or unavailable. Check YouTube directly or return to the catalogue.",
    title: "Video not found",
  },
  PLAYBACK_ERROR: {
    description:
      "Playback failed to initialize in the embedded player. Watch directly on YouTube or return to the catalogue.",
    title: "Unable to load YouTube player",
  },
};

interface VodPlayerErrorCardProps {
  error: VodPlayerFatalError;
  youtubeVideoId: string;
}

function VodPlayerErrorCard({ error, youtubeVideoId }: VodPlayerErrorCardProps) {
  const { description, title } = PLAYER_ERROR_COPY[error];
  const youtubeWatchUrl = `https://www.youtube.com/watch?v=${encodeURIComponent(youtubeVideoId)}`;

  return (
    <Card className="aspect-video w-full justify-center" role="alert">
      <CardHeader>
        <CardTitle>
          <h2>{title}</h2>
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-2">
        <a
          className={buttonVariants({ variant: "default" })}
          href={youtubeWatchUrl}
          rel="noopener noreferrer"
          target="_blank"
        >
          Watch on YouTube
        </a>
        <Link className={buttonVariants({ variant: "outline" })} to="/vods">
          Back to Catalogue
        </Link>
      </CardContent>
    </Card>
  );
}

export { VodPlayerErrorCard };
