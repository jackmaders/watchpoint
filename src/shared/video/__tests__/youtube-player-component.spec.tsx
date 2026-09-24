import { render } from "@testing-library/react";
import type React from "react";
import { createRef } from "react";
import { describe, expect, test, vi } from "vitest";
import { YouTubePlayer } from "../youtube-player-component";

const TEST_VIDEO_SRC = "https://www.youtube.com/watch?v=test-video-id";

vi.mock("youtube-video-element/react", () => ({
	default: ({
		ref,
		...props
	}: Record<string, unknown> & {
		ref?: React.Ref<HTMLVideoElement>;
	}) => <video ref={ref} {...props} />,
}));

describe("YouTube player component", () => {
	test("renders custom video element with forwarded props and merged style", () => {
		const { container } = render(
			<YouTubePlayer
				className="custom-player"
				height="360px"
				src={TEST_VIDEO_SRC}
				style={{ backgroundColor: "black" }}
				width="640px"
			/>,
		);

		const element = container.querySelector("video");
		expect(element).toBeInTheDocument();
		expect(element).toHaveAttribute("src", TEST_VIDEO_SRC);
		expect(element).toHaveClass("custom-player");
		expect(element).toHaveStyle({
			width: "640px",
			height: "360px",
			backgroundColor: "black",
		});
	});

	test("attaches forwarded ref to underlying media element", () => {
		const ref = createRef<HTMLVideoElement>();
		render(<YouTubePlayer ref={ref} src={TEST_VIDEO_SRC} />);

		expect(ref.current).toBeInstanceOf(HTMLElement);
		expect(ref.current?.tagName.toLowerCase()).toBe("video");
	});
});
