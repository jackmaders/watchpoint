import { Play, Radio } from "lucide-react";
import { lazy, Suspense, useCallback, useState } from "react";
import { formatTime } from "@/shared/lib/format-time";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/shared/ui/card";
import {
	type VideoMarker,
	VOD_TIMESTAMP_PRECISION_SECONDS,
} from "@/shared/video";

const VideoPlayerDemo = lazy(() => import("./video-player-demo"));

const DEMO_MARKERS: readonly VideoMarker[] = [
	{ id: "opening-read", timestampSeconds: 5 },
	{ id: "midpoint-check", timestampSeconds: 15 },
	{ id: "closing-read", timestampSeconds: 25 },
];

type PlayerStatus =
	| "Not loaded"
	| "Loading"
	| "Ready"
	| "Playing"
	| "Paused"
	| "Ended";

export function VideoDemo({
	initialTimestampSeconds,
}: {
	readonly initialTimestampSeconds: number;
}) {
	const [isPlayerActive, setIsPlayerActive] = useState(false);
	const [activeMarker, setActiveMarker] = useState<VideoMarker | null>(null);
	const [currentTime, setCurrentTime] = useState(0);
	const [playerStatus, setPlayerStatus] = useState<PlayerStatus>("Not loaded");

	const activatePlayer = useCallback(() => {
		setIsPlayerActive(true);
		setPlayerStatus("Loading");
	}, []);

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
							variant={
								playerStatus === "Not loaded" || playerStatus === "Loading"
									? "outline"
									: "default"
							}
						>
							<span
								className={`size-1.5 rounded-full ${playerStatus === "Not loaded" || playerStatus === "Loading" ? "bg-muted-foreground" : "bg-primary-foreground"}`}
							/>
							{playerStatus}
						</Badge>
					</div>
					<CardTitle className="mt-2 text-2xl">
						A marker-aware VOD player
					</CardTitle>
					<CardDescription className="mt-2 max-w-xl leading-6">
						The player package owns lifecycle and controls; the sync engine
						pauses playback just before each marker so a Lesson can ask a
						Question at the right moment.
					</CardDescription>
				</CardHeader>

				<CardContent className="mt-6 p-0">
					{isPlayerActive ? (
						<Suspense fallback={<VideoPlayerLoading />}>
							<VideoPlayerDemo
								initialTimestampSeconds={initialTimestampSeconds}
								markers={DEMO_MARKERS}
								onMarkerTrigger={setActiveMarker}
								onStatusChange={setPlayerStatus}
								onTimeUpdate={setCurrentTime}
							/>
						</Suspense>
					) : (
						<VideoPlayerFacade onActivate={activatePlayer} />
					)}
				</CardContent>
			</div>

			<div className="border-border/70 border-t p-6 lg:col-span-2 lg:border-t-0 lg:border-l lg:p-8">
				<div className="flex items-center gap-2 font-mono text-muted-foreground text-xs uppercase tracking-label">
					<Radio aria-hidden="true" className="size-3.5 text-primary" />
					Live readout
				</div>
				<dl className="mt-6 grid grid-cols-2 gap-x-4 gap-y-5">
					<Readout label="State" value={playerStatus} />
					<Readout
						label="Time"
						value={formatTime(currentTime, VOD_TIMESTAMP_PRECISION_SECONDS)}
					/>
				</dl>

				<div className="mt-8 border-border/70 border-t pt-5">
					<p className="font-mono text-muted-foreground text-xs uppercase tracking-label">
						Marker map
					</p>
					<ul className="mt-4 space-y-3">
						{DEMO_MARKERS.map((marker) => (
							<li
								className="flex items-center justify-between gap-4 text-sm"
								key={marker.id}
							>
								<span className="flex items-center gap-2">
									<span
										aria-hidden="true"
										className={`size-1.5 rounded-full ${activeMarker?.id === marker.id ? "bg-primary" : "bg-border"}`}
									/>
									{marker.id.replaceAll("-", " ")}
								</span>
								<span className="font-mono text-muted-foreground text-xs">
									{formatTime(
										marker.timestampSeconds,
										VOD_TIMESTAMP_PRECISION_SECONDS,
									)}
								</span>
							</li>
						))}
					</ul>
				</div>
			</div>
		</Card>
	);
}

function VideoPlayerFacade({ onActivate }: { onActivate: () => void }) {
	return (
		<div className="flex aspect-video w-full flex-col items-center justify-center gap-3 rounded-lg border border-border/70 bg-background/40 p-6 text-center">
			<Button onClick={onActivate} size="lg" type="button">
				<Play aria-hidden="true" />
				Load video demo
			</Button>
			<p className="max-w-sm text-muted-foreground text-xs leading-5">
				YouTube loads only after you request the interactive player.
			</p>
		</div>
	);
}

function VideoPlayerLoading() {
	return (
		<div className="flex aspect-video w-full items-center justify-center rounded-lg border border-border/70 bg-background/40 text-muted-foreground text-sm">
			Loading the interactive player…
		</div>
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
