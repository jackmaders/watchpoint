/**
 * @fileOverview Demonstrates ReactPlayer and Media Chrome with Watchpoint cue timing.
 *
 * Shows how generic playback controls can live outside the slice while cue pauses remain product behavior.
 */

import { Radio, SkipForward } from "lucide-react";
import {
	MediaControlBar,
	MediaController,
	MediaFullscreenButton,
	MediaMuteButton,
	MediaPlayButton,
	MediaPlaybackRateButton,
	MediaSeekBackwardButton,
	MediaSeekForwardButton,
	MediaTimeDisplay,
	MediaTimeRange,
	MediaVolumeRange,
} from "media-chrome/react";
import { useCallback, useState } from "react";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/shared/ui/card";
import { ReactPlayer, useVideoCueSync, type VideoCue } from "@/shared/video";

// biome-ignore lint/security/noSecrets: Public YouTube demo video identifier.
const DEMO_VIDEO_SRC = "https://www.youtube.com/watch?v=M7lc1UVf-VE";

const DEMO_CUES: readonly VideoCue[] = [
	{ id: "opening-read", timestampSeconds: 5 },
	{ id: "midpoint-check", timestampSeconds: 15 },
	{ id: "closing-read", timestampSeconds: 25 },
];

type PlayerStatus = "Loading" | "Ready" | "Playing" | "Paused" | "Ended";

export function VideoDemo() {
	const [playerElement, setPlayerElement] = useState<HTMLVideoElement | null>(
		null,
	);
	const [activeCue, setActiveCue] = useState<VideoCue | null>(null);
	const [playerStatus, setPlayerStatus] = useState<PlayerStatus>("Loading");
	const { currentTime } = useVideoCueSync({
		cues: DEMO_CUES,
		onCueTrigger: setActiveCue,
		player: playerElement,
	});
	const handleEnded = useCallback(() => setPlayerStatus("Ended"), []);
	const handleError = useCallback(() => setPlayerStatus("Loading"), []);
	const handlePause = useCallback(() => setPlayerStatus("Paused"), []);
	const handlePlay = useCallback(() => setPlayerStatus("Playing"), []);
	const handleReady = useCallback(() => setPlayerStatus("Ready"), []);

	const previewFirstCue = useCallback(() => {
		if (playerElement) {
			playerElement.currentTime = DEMO_CUES[0].timestampSeconds - 1;
		}
	}, [playerElement]);

	return (
		<Card className="overflow-hidden border-primary/20 bg-accent/20 lg:grid lg:grid-cols-5 lg:gap-0">
			<div className="bg-foreground/5 p-6 lg:col-span-3 lg:p-8">
				<CardHeader className="p-0">
					<div className="flex items-center justify-between gap-4">
						<CardDescription className="font-mono text-xs uppercase tracking-label">
							Shared video slice
						</CardDescription>
						<Badge
							className="gap-1.5"
							variant={playerStatus === "Loading" ? "outline" : "default"}
						>
							<span
								className={`size-1.5 rounded-full ${playerStatus === "Loading" ? "bg-muted-foreground" : "bg-primary-foreground"}`}
							/>
							{playerStatus}
						</Badge>
					</div>
					<CardTitle className="mt-2 text-2xl">
						A cue-aware VOD player
					</CardTitle>
					<CardDescription className="mt-2 max-w-xl leading-6">
						The player package owns lifecycle and controls; the sync engine
						pauses playback just before each cue so a Lesson can ask a Question
						at the right moment.
					</CardDescription>
				</CardHeader>

				<CardContent className="mt-6 p-0">
					<MediaController style={{ aspectRatio: "16 / 9", width: "100%" }}>
						<ReactPlayer
							className="video-demo-media"
							controls={false}
							height="100%"
							onEnded={handleEnded}
							onError={handleError}
							onPause={handlePause}
							onPlay={handlePlay}
							onReady={handleReady}
							ref={setPlayerElement}
							slot="media"
							src={DEMO_VIDEO_SRC}
							width="100%"
						/>
						<MediaControlBar>
							<MediaPlayButton />
							<MediaSeekBackwardButton seekOffset={10} />
							<MediaSeekForwardButton seekOffset={10} />
							<MediaTimeRange />
							<MediaTimeDisplay showDuration />
							<MediaMuteButton />
							<MediaVolumeRange />
							<MediaPlaybackRateButton />
							<MediaFullscreenButton />
						</MediaControlBar>
					</MediaController>
					<div className="mt-4 flex flex-wrap items-center gap-2">
						<Button
							disabled={!playerElement}
							onClick={previewFirstCue}
							variant="ghost"
						>
							<SkipForward aria-hidden="true" />
							Preview first cue
						</Button>
					</div>
				</CardContent>
			</div>

			<div className="border-border/70 border-t p-6 lg:col-span-2 lg:border-t-0 lg:border-l lg:p-8">
				<div className="flex items-center gap-2 font-mono text-muted-foreground text-xs uppercase tracking-label">
					<Radio aria-hidden="true" className="size-3.5 text-primary" />
					Live readout
				</div>
				<dl className="mt-6 grid grid-cols-2 gap-x-4 gap-y-5">
					<Readout label="State" value={playerStatus} />
					<Readout label="Time" value={formatTime(currentTime)} />
				</dl>

				<div className="mt-8 border-border/70 border-t pt-5">
					<p className="font-mono text-muted-foreground text-xs uppercase tracking-label">
						Cue map
					</p>
					<ul className="mt-4 space-y-3">
						{DEMO_CUES.map((cue) => (
							<li
								className="flex items-center justify-between gap-4 text-sm"
								key={cue.id}
							>
								<span className="flex items-center gap-2">
									<span
										className={`size-1.5 rounded-full ${activeCue?.id === cue.id ? "bg-primary" : "bg-border"}`}
									/>
									{cue.id.replaceAll("-", " ")}
								</span>
								<span className="font-mono text-muted-foreground text-xs">
									{formatTime(cue.timestampSeconds)}
								</span>
							</li>
						))}
					</ul>
				</div>
			</div>
		</Card>
	);
}

function Readout({ label, value }: { label: string; value: string }) {
	return (
		<div>
			<dt className="font-mono text-muted-foreground text-xs uppercase tracking-label">
				{label}
			</dt>
			<dd className="mt-1 font-medium text-lg tracking-tight">{value}</dd>
		</div>
	);
}

function formatTime(seconds: number): string {
	const wholeSeconds = Math.max(0, Math.floor(seconds));
	const minutes = Math.floor(wholeSeconds / 60);
	const remainingSeconds = wholeSeconds % 60;
	return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
}
