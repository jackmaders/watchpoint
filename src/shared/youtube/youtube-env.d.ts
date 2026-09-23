/// <reference types="youtube" />

declare global {
	interface Window {
		onYouTubeIframeAPIReady?: (() => void) | undefined;
		// biome-ignore lint/style/useNamingConvention: YouTube official global API name
		YT?: typeof YT | undefined;
	}
}

export {};
