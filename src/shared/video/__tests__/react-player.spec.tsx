import { render } from "@testing-library/react";
import type React from "react";
import { describe, expect, test, vi } from "vitest";
import { ReactPlayer } from "../react-player";

const TEST_VIDEO_SRC = "https://www.youtube.com/watch?v=test-video-id";

vi.mock("youtube-video-element/react", () => ({
	default: ({
		ref,
		...props
	}: Record<string, unknown> & {
		ref?: React.Ref<HTMLVideoElement>;
	}) => <video ref={ref} {...props} />,
}));

describe("ReactPlayer", () => {
	test("renders YouTubePlayer when given a YouTube URL", () => {
		const { container } = render(
			<ReactPlayer controls={false} src={TEST_VIDEO_SRC} />,
		);

		const videoElement = container.querySelector("video");
		expect(videoElement).toBeInTheDocument();
		expect(videoElement).toHaveAttribute("src", TEST_VIDEO_SRC);
	});

	test("passes dimensions and control options to the underlying player element", () => {
		const { container } = render(
			<ReactPlayer
				controls
				height="480px"
				src={TEST_VIDEO_SRC}
				width="854px"
			/>,
		);

		const videoElement = container.querySelector("video");
		expect(videoElement).toBeInTheDocument();
		expect(videoElement).toHaveAttribute("controls");
		expect(videoElement?.style.width).toBe("854px");
		expect(videoElement?.style.height).toBe("480px");
	});
});
