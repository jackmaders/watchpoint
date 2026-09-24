import React from "react";
import { canPlay } from "react-player/patterns";
import type { PlayerEntry } from "react-player/players";
import { createReactPlayer } from "react-player/ReactPlayer";
import { YouTubePlayer } from "./youtube-player-component";

const YOUTUBE_PLAYER: PlayerEntry = {
	canPlay: canPlay.youtube,
	key: "youtube",
	name: "YouTube",
	player: YouTubePlayer,
};

export const ReactPlayer = React.memo(
	createReactPlayer([YOUTUBE_PLAYER], YOUTUBE_PLAYER),
);
