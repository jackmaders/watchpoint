import type { VideoElementProps } from "react-player/types";
import type YouTubeMediaElement from "youtube-video-element";
import YouTubeVideoElement from "youtube-video-element/react";

export const YouTubePlayer = ({
	config: _config,
	preload: _preload,
	ref,
	height,
	style,
	width,
	...props
}: VideoElementProps) => {
	return (
		<YouTubeVideoElement
			{...props}
			// biome-ignore lint/nursery/noUnsafeTypeAssertion: Bridge react-player HTMLVideoElement ref with youtube-video-element
			ref={ref as React.Ref<YouTubeMediaElement>}
			style={{ width, height, ...style }}
		/>
	);
};
