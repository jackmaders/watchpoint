import { useCallback, useRef } from "react";
import type { PlaybackStatus, VodContainerRef, VodPlayerResult } from "./types";
import { useVodPlayer } from "./use-vod-player";

export type SessionMediaEvent =
	| { duration: number; generation?: number; type: "READY" }
	| {
			generation?: number;
			status: PlaybackStatus;
			type: "PLAYBACK_STATUS_CHANGED";
	  }
	| { generation?: number; time: number; type: "TIME_UPDATED" };

export type SessionMediaCommand =
	| { type: "PAUSE" }
	| { type: "PLAY" }
	| { timestampSeconds: number; type: "REPLAY_CONTEXT" }
	| { autoplay: boolean; type: "RESTART" };

export interface SessionMediaAdapterOptions {
	autoplay?: boolean;
	generation?: number;
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

function addGeneration<T extends object>(
	event: T,
	generation: number | undefined,
): T & { generation?: number } {
	return generation === undefined ? event : { ...event, generation };
}

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
	generation,
	onEvent,
	videoId,
}: SessionMediaAdapterOptions): SessionMediaAdapterResult {
	const controlsRef = useRef<SessionMediaControls | null>(null);
	const pendingCommandRef = useRef<SessionMediaCommand | null>(null);
	const onReady = useCallback(
		(duration: number, lifecycleKey?: number) => {
			onEvent?.(addGeneration({ duration, type: "READY" }, lifecycleKey));
			const pendingCommand = pendingCommandRef.current;
			const controls = controlsRef.current;
			if (!pendingCommand || !controls) return;
			pendingCommandRef.current = null;
			executeSessionMediaCommand(pendingCommand, controls);
		},
		[onEvent],
	);
	const onStatusChange = useCallback(
		(status: PlaybackStatus, lifecycleKey?: number) =>
			onEvent?.(
				addGeneration(
					{ status, type: "PLAYBACK_STATUS_CHANGED" },
					lifecycleKey,
				),
			),
		[onEvent],
	);
	const onTimeUpdate = useCallback(
		(time: number, lifecycleKey?: number) =>
			onEvent?.(addGeneration({ time, type: "TIME_UPDATED" }, lifecycleKey)),
		[onEvent],
	);
	const player = useVodPlayer({
		autoplay,
		lifecycleKey: generation,
		onReady,
		onStatusChange,
		onTimeUpdate,
		videoId,
	});
	controlsRef.current = player;
	const execute = useCallback(
		(command: SessionMediaCommand) => {
			if (command.type === "RESTART") {
				pendingCommandRef.current = command;
				return;
			}
			executeSessionMediaCommand(command, player);
		},
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
