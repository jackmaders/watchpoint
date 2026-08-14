import { act, renderHook } from "@testing-library/react";
import type { PropsWithChildren } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createYouTubeMock } from "../__mocks__/youtube";
import { useYouTubePlayer } from "../use-youtube-player";
import type { YouTubeNamespace } from "../youtube";

function setYouTubeNamespace(namespace: YouTubeNamespace | undefined) {
	Object.defineProperty(window, "YT", {
		configurable: true,
		value: namespace,
	});
}

describe("useYouTubePlayer", () => {
	afterEach(() => {
		vi.restoreAllMocks();
		setYouTubeNamespace(undefined);
	});

	it("creates a configured player and reports readiness with its duration", async () => {
		// Arrange
		const youtube = createYouTubeMock(142);
		setYouTubeNamespace(youtube.namespace);
		const onReady = vi.fn();
		const containerRef: { current: HTMLDivElement | null } = { current: null };
		const wrapper = ({ children }: PropsWithChildren) => (
			<div
				ref={(node) => {
					containerRef.current = node;
				}}
			>
				{children}
			</div>
		);

		// Act
		const { result } = renderHook(
			() =>
				useYouTubePlayer({
					autoplay: true,
					containerRef,
					onReady,
					videoId: "dQw4w9WgXcQ",
				}),
			{ wrapper },
		);
		const initialState = { ...result.current };
		await act(async () => {
			await Promise.resolve();
			await Promise.resolve();
		});
		const player = youtube.players[0];
		act(() => player.triggerReady());

		// Assert
		expect(initialState.isReady).toBe(false);
		expect(initialState.duration).toBe(0);
		expect(initialState.currentTime).toBe(0);
		expect(youtube.players).toHaveLength(1);
		expect(player.options).toEqual({
			events: expect.any(Object),
			playerVars: { autoplay: 1, controls: 0 },
			videoId: "dQw4w9WgXcQ",
		});
		expect(result.current.isReady).toBe(true);
		expect(result.current.duration).toBe(142);
		expect(result.current.currentTime).toBe(0);
		expect(onReady).toHaveBeenCalledTimes(1);
		expect(onReady).toHaveBeenCalledWith(142);
	});
});
