/**
 * @fileOverview Adapts the YouTube media element to ReactPlayer's provider contract.
 *
 * Normalizes the provider's custom-element props while preserving the media ref used by controls and cue timing.
 */

import type { VideoElementProps } from "react-player/types";
import type YouTubeMediaElement from "youtube-video-element";
import YouTubeVideoElement from "youtube-video-element/react";

export const YouTubePlayer = ({
	config: _config,
	height: _height,
	preload: _preload,
	ref,
	width: _width,
	...props
}: VideoElementProps) => {
	const handleRef = (element: YouTubeMediaElement | null) => {
		if (typeof ref === "function") {
			ref(element);
			return;
		}
		if (ref) {
			ref.current = element;
		}
	};

	return <YouTubeVideoElement {...props} ref={handleRef} />;
};
