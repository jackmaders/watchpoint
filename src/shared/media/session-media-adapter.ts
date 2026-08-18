import { useCallback, useRef, useState } from "react";
import type {
	MediaDiagnostic,
	MediaFailure,
	MediaFailureCategory,
	PlaybackStatus,
	VodContainerRef,
	VodPlayerResult,
} from "./types";
import { useVodPlayer } from "./use-vod-player";

export type SessionMediaEvent =
	| { duration: number; generation?: number; type: "READY" }
	| {
			failure: MediaFailure;
			generation?: number;
			retryCount: number;
			type: "MEDIA_FAILURE";
	  }
	| {
			generation?: number;
			retryCount: number;
			type: "RECOVERY_SUCCEEDED";
	  }
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
	| { autoplay: boolean; type: "RECOVER" }
	| { autoplay: boolean; type: "RESTART" };

export interface SessionMediaAdapterOptions {
	autoplay?: boolean;
	generation?: number;
	onEvent?: (event: SessionMediaEvent) => void;
	onDiagnostics?: (diagnostic: MediaDiagnostic) => void;
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

function shouldCompleteRecovery(
	failureCategory: MediaFailureCategory,
	autoplay: boolean,
): boolean {
	return failureCategory !== "buffering" || !autoplay;
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
		case "RECOVER":
			return;
		case "RESTART":
			controls.seekTo(0, true);
			if (command.autoplay) controls.play();
	}
}

// biome-ignore lint/complexity/noExcessiveLinesPerFunction: this hook coordinates the adapter lifecycle and remains the public media seam.
export function useSessionMediaAdapter({
	autoplay = false,
	generation,
	onEvent,
	onDiagnostics,
	videoId,
}: SessionMediaAdapterOptions): SessionMediaAdapterResult {
	const controlsRef = useRef<SessionMediaControls | null>(null);
	const pendingCommandRef = useRef<SessionMediaCommand | null>(null);
	const [recoveryKey, setRecoveryKey] = useState(0);
	const retryCountRef = useRef(0);
	const recoveryPositionRef = useRef(0);
	const recoveringRef = useRef(false);
	const recoveryAutoplayRef = useRef(false);
	const recoveryFailureCategoryRef = useRef<MediaFailureCategory>("readiness");
	const completeRecovery = useCallback(() => {
		recoveringRef.current = false;
		onDiagnostics?.({
			currentTime: recoveryPositionRef.current,
			eventTimestamp: Date.now(),
			eventType: "recovery",
			failureCategory: recoveryFailureCategoryRef.current,
			generation: generation ?? 0,
			outcome: "recovered",
			retryCount: retryCountRef.current,
			videoId,
		});
		onEvent?.(
			addGeneration(
				{ retryCount: retryCountRef.current, type: "RECOVERY_SUCCEEDED" },
				generation,
			),
		);
	}, [generation, onDiagnostics, onEvent, videoId]);
	const onReady = useCallback(
		// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: readiness coordinates pending commands and recovery confirmation at the adapter seam.
		(duration: number, _lifecycleKey?: number) => {
			const eventGeneration = generation;
			onEvent?.(addGeneration({ duration, type: "READY" }, eventGeneration));
			const pendingCommand = pendingCommandRef.current;
			const controls = controlsRef.current;
			if (recoveringRef.current && controls) {
				controls.seekTo(Math.max(0, recoveryPositionRef.current), true);
				if (recoveryAutoplayRef.current) controls.play();
				if (
					shouldCompleteRecovery(
						recoveryFailureCategoryRef.current,
						recoveryAutoplayRef.current,
					)
				) {
					completeRecovery();
				}
			}
			if (pendingCommand && controls) {
				pendingCommandRef.current = null;
				executeSessionMediaCommand(pendingCommand, controls);
			}
		},
		[completeRecovery, generation, onEvent],
	);
	const onStatusChange = useCallback(
		(status: PlaybackStatus, _lifecycleKey?: number) =>
			onEvent?.(
				addGeneration({ status, type: "PLAYBACK_STATUS_CHANGED" }, generation),
			),
		[generation, onEvent],
	);
	const onTimeUpdate = useCallback(
		(time: number, _lifecycleKey?: number) => {
			if (
				recoveringRef.current &&
				recoveryFailureCategoryRef.current === "buffering" &&
				recoveryAutoplayRef.current &&
				time > recoveryPositionRef.current + 0.1
			) {
				completeRecovery();
			}
			onEvent?.(addGeneration({ time, type: "TIME_UPDATED" }, generation));
		},
		[completeRecovery, generation, onEvent],
	);
	const onError = useCallback(
		(failure: MediaFailure) => {
			recoveryFailureCategoryRef.current = failure.category;
			const retryCount = retryCountRef.current;
			onDiagnostics?.({
				currentTime: recoveryPositionRef.current,
				eventTimestamp: Date.now(),
				eventType: "failure",
				failureCategory: failure.category,
				generation: generation ?? 0,
				outcome: retryCount > 0 ? "terminal" : "recovered",
				retryCount,
				videoId,
				...(failure.code ? { providerCode: failure.code } : {}),
			});
			onEvent?.(
				addGeneration(
					{ failure, retryCount, type: "MEDIA_FAILURE" },
					generation,
				),
			);
		},
		[generation, onDiagnostics, onEvent, videoId],
	);
	const player = useVodPlayer({
		autoplay,
		lifecycleKey:
			generation === undefined ? undefined : generation * 1000 + recoveryKey,
		onError,
		onReady,
		onStatusChange,
		onTimeUpdate,
		videoId,
	});
	controlsRef.current = player;
	const execute = useCallback(
		(command: SessionMediaCommand) => {
			if (command.type === "RECOVER") {
				recoveryPositionRef.current = player.currentTime;
				recoveryAutoplayRef.current = command.autoplay;
				retryCountRef.current += 1;
				recoveringRef.current = true;
				setRecoveryKey((key) => key + 1);
				return;
			}
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
