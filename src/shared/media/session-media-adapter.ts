import { useCallback } from "react";
import type { PlaybackStatus, VodContainerRef, VodPlayerResult } from "./types";
import { useVodPlayer } from "./use-vod-player";

export type SessionMediaEvent =
	| { duration: number; type: "READY" }
	| { status: PlaybackStatus; type: "PLAYBACK_STATUS_CHANGED" }
	| { time: number; type: "TIME_UPDATED" };

export type SessionMediaCommand =
	| { type: "PAUSE" }
	| { type: "PLAY" }
	| { timestampSeconds: number; type: "REPLAY_CONTEXT" }
	| { autoplay: boolean; type: "RESTART" };

export interface SessionMediaAdapterOptions {
	autoplay?: boolean;
	onEvent?: (event: SessionMediaEvent) => void;
	videoId: string;
}

export interface SessionMediaAdapterResult {
	containerRef: VodContainerRef;
	currentTime: number;
	duration: number;
	execute: (command: SessionMediaCommand) => void;
	isReady: boolean;
	status: PlaybackStatus;
}

type SessionMediaControls = Pick<VodPlayerResult, "pause" | "play" | "seekTo">;

export function executeSessionMediaCommand(
	command: SessionMediaCommand,
	controls: SessionMediaControls,
): void {
	switch (command.type) {
		case "PAUSE":
			controls.pause();
			return;
		case "PLAY":
			controls.play();
			return;
		case "REPLAY_CONTEXT":
			controls.seekTo(Math.max(0, command.timestampSeconds - 10), true);
			controls.play();
			return;
		case "RESTART":
			controls.seekTo(0, true);
			if (command.autoplay) controls.play();
	}
}

export function useSessionMediaAdapter({
	autoplay = false,
	onEvent,
	videoId,
}: SessionMediaAdapterOptions): SessionMediaAdapterResult {
	const onReady = useCallback(
		(duration: number) => onEvent?.({ duration, type: "READY" }),
		[onEvent],
	);
	const onStatusChange = useCallback(
		(status: PlaybackStatus) =>
			onEvent?.({ status, type: "PLAYBACK_STATUS_CHANGED" }),
		[onEvent],
	);
	const onTimeUpdate = useCallback(
		(time: number) => onEvent?.({ time, type: "TIME_UPDATED" }),
		[onEvent],
	);
	const player = useVodPlayer({
		autoplay,
		onReady,
		onStatusChange,
		onTimeUpdate,
		videoId,
	});
	const execute = useCallback(
		(command: SessionMediaCommand) =>
			executeSessionMediaCommand(command, player),
		[player],
	);

	return {
		containerRef: player.containerRef,
		currentTime: player.currentTime,
		duration: player.duration,
		execute,
		isReady: player.isReady,
		status: player.status,
	};
}
