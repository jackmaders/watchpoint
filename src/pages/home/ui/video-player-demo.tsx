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
import { type CSSProperties, useCallback, useRef, useState } from "react";
import { Button } from "@/shared/ui/button";
import {
	parseVodTimestamp,
	ReactPlayer,
	useVideoMarkerSync,
	type VideoMarker,
} from "@/shared/video";

// biome-ignore lint/security/noSecrets: Public YouTube demo video identifier.
const DEMO_VIDEO_SRC = "https://www.youtube.com/watch?v=M7lc1UVf-VE";

const MEDIA_CONTROLLER_STYLE: CSSProperties & {
	"--media-control-height": string;
	"--media-control-padding": string;
} = {
	aspectRatio: "16 / 9",
	width: "100%",
	"--media-control-height": "24px",
	"--media-control-padding": "10px",
};

type PlayerStatus = "Loading" | "Ready" | "Playing" | "Paused" | "Ended";

interface VideoPlayerDemoProps {
	readonly initialTimestampSeconds: number;
	readonly markers: readonly VideoMarker[];
	readonly onMarkerTrigger: (markers: VideoMarker) => void;
	readonly onStatusChange: (status: PlayerStatus) => void;
	readonly onTimeUpdate: (currentTime: number) => void;
}

export default function VideoPlayerDemo({
	initialTimestampSeconds,
	markers,
	onMarkerTrigger,
	onStatusChange,
	onTimeUpdate,
}: VideoPlayerDemoProps) {
	const [playerElement, setPlayerElement] = useState<HTMLVideoElement | null>(
		null,
	);
	const playerElementRef = useRef<HTMLVideoElement | null>(null);
	const handlePlayerRef = useCallback((element: HTMLVideoElement | null) => {
		playerElementRef.current = element;
		setPlayerElement(element);
	}, []);
	const { currentTime, resetTriggeredMarkers } = useVideoMarkerSync({
		markers,
		onMarkerTrigger,
		onTimeUpdate,
		player: playerElement,
	});
	const handleEnded = useCallback(
		() => onStatusChange("Ended"),
		[onStatusChange],
	);
	const handleError = useCallback(
		() => onStatusChange("Loading"),
		[onStatusChange],
	);
	const handlePause = useCallback(
		() => onStatusChange("Paused"),
		[onStatusChange],
	);
	const handlePlay = useCallback(
		() => onStatusChange("Playing"),
		[onStatusChange],
	);
	const handleReady = useCallback(() => {
		const player = playerElementRef.current;
		if (player && initialTimestampSeconds > 0) {
			resetTriggeredMarkers();
			const timestamp = parseVodTimestamp(
				initialTimestampSeconds,
				player.duration,
			);
			player.currentTime = timestamp;
			onTimeUpdate(timestamp);
		}
		onStatusChange("Ready");
	}, [
		initialTimestampSeconds,
		onStatusChange,
		onTimeUpdate,
		resetTriggeredMarkers,
	]);
	const previewFirstMarker = useCallback(() => {
		const firstMarker = markers[0];
		if (playerElement && firstMarker) {
			resetTriggeredMarkers();
			playerElement.currentTime = Math.max(0, firstMarker.timestampSeconds - 1);
		}
	}, [markers, playerElement, resetTriggeredMarkers]);

	return (
		<>
			<MediaController style={MEDIA_CONTROLLER_STYLE}>
				<ReactPlayer
					className="video-demo-media"
					controls={false}
					height="100%"
					onEnded={handleEnded}
					onError={handleError}
					onPause={handlePause}
					onPlay={handlePlay}
					onReady={handleReady}
					ref={handlePlayerRef}
					slot="media"
					src={DEMO_VIDEO_SRC}
					width="100%"
				/>
				<MediaControlBar className="flex w-full flex-wrap">
					<MediaPlayButton className="shrink-0" />
					<MediaSeekBackwardButton
						className="hidden shrink-0 sm:inline-flex"
						seekOffset={10}
					/>
					<MediaSeekForwardButton
						className="hidden shrink-0 sm:inline-flex"
						seekOffset={10}
					/>
					<MediaTimeRange className="min-w-0 flex-1" />
					<MediaTimeDisplay
						className="hidden shrink-0 sm:inline-flex"
						noToggle
						showDuration
					/>
					<MediaMuteButton className="shrink-0" />
					<MediaVolumeRange className="hidden min-w-16 flex-1 sm:inline-block" />
					<MediaPlaybackRateButton className="hidden shrink-0 sm:inline-flex" />
					<MediaFullscreenButton className="shrink-0" />
				</MediaControlBar>
			</MediaController>
			<div className="mt-4 flex flex-wrap items-center gap-2">
				<Button
					disabled={!playerElement}
					onClick={previewFirstMarker}
					variant="ghost"
				>
					Preview first marker
				</Button>
				<span className="text-muted-foreground text-xs">
					Current time {formatTime(currentTime)}
				</span>
			</div>
		</>
	);
}

function formatTime(seconds: number): string {
	const wholeSeconds = Math.max(0, Math.floor(seconds));
	const minutes = Math.floor(wholeSeconds / 60);
	const remainingSeconds = wholeSeconds % 60;
	return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
}
