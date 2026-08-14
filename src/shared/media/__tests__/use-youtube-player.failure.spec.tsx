import { act, renderHook } from "@testing-library/react";
import type { PropsWithChildren } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createYouTubeMock, setYouTubeNamespace } from "../__mocks__/youtube";

describe("useYouTubePlayer loader failure boundary", () => {
	beforeEach(() => {
		vi.resetModules();
	});

	afterEach(() => {
		vi.restoreAllMocks();
		setYouTubeNamespace(undefined);
		document.head.replaceChildren();
		delete window.onYouTubeIframeAPIReady;
	});

	it("remains safely unready when the API script fails", async () => {
		// Arrange
		vi.spyOn(document.head, "appendChild").mockImplementation((node) => node);
		const { useYouTubePlayer } = await import("../use-youtube-player");
		const youtube = createYouTubeMock();
		const containerRef: { current: HTMLDivElement | null } = { current: null };
		const wrapper = ({ children }: PropsWithChildren) => (
			<div ref={containerRef}>{children}</div>
		);

		// Act
		const { result } = renderHook(
			() => useYouTubePlayer({ containerRef, videoId: "failed-video" }),
			{ wrapper },
		);
		const [script] = vi.mocked(document.head.appendChild).mock.calls[0] as [
			HTMLScriptElement,
		];
		act(() => script.onerror?.(new Event("error")));
		await act(async () => {
			await Promise.resolve();
			await Promise.resolve();
		});

		// Assert
		expect(youtube.players).toHaveLength(0);
		expect(result.current.isReady).toBe(false);
		expect(result.current.duration).toBe(0);
	});

	it("ignores API readiness that arrives after unmount", async () => {
		// Arrange
		vi.spyOn(document.head, "appendChild").mockImplementation((node) => node);
		const { useYouTubePlayer } = await import("../use-youtube-player");
		const youtube = createYouTubeMock();
		const containerRef: { current: HTMLDivElement | null } = { current: null };
		const wrapper = ({ children }: PropsWithChildren) => (
			<div ref={containerRef}>{children}</div>
		);
		const { unmount } = renderHook(
			() => useYouTubePlayer({ containerRef, videoId: "late-video" }),
			{ wrapper },
		);
		const [script] = vi.mocked(document.head.appendChild).mock.calls[0] as [
			HTMLScriptElement,
		];

		// Act
		unmount();
		setYouTubeNamespace(youtube.namespace);
		window.onYouTubeIframeAPIReady?.();
		script.onload?.(new Event("load"));
		await act(async () => {
			await Promise.resolve();
			await Promise.resolve();
		});

		// Assert
		expect(youtube.players).toHaveLength(0);
	});
});
