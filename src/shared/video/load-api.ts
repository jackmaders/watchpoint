const YOUTUBE_IFRAME_API_SRC = "https://www.youtube.com/iframe_api";

let loadingPromise: Promise<typeof YT> | null = null;

export function loadYouTubeIframeApi(): Promise<typeof YT> {
	if (typeof window === "undefined") {
		return Promise.reject(
			new Error("YouTube IFrame API can only be loaded in browser environment"),
		);
	}

	if (window.YT?.Player) {
		return Promise.resolve(window.YT);
	}

	if (loadingPromise !== null) {
		return loadingPromise;
	}

	loadingPromise = new Promise<typeof YT>((resolve, reject) => {
		const existingScript = document.querySelector<HTMLScriptElement>(
			`script[src="${YOUTUBE_IFRAME_API_SRC}"]`,
		);

		const previousReady = window.onYouTubeIframeAPIReady;
		window.onYouTubeIframeAPIReady = () => {
			previousReady?.();
			if (window.YT) {
				resolve(window.YT);
			} else {
				reject(
					new Error("YouTube IFrame API loaded but window.YT is not defined"),
				);
			}
		};

		if (!existingScript) {
			const script = document.createElement("script");
			script.src = YOUTUBE_IFRAME_API_SRC;
			script.async = true;
			script.addEventListener("error", () => {
				// In test environments (happy-dom), external scripts cannot be fetched over network.
				// Only reject if window.YT wasn't populated or mock onYouTubeIframeAPIReady wasn't handled.
				if (!window.YT) {
					loadingPromise = null;
					reject(new Error("Failed to load YouTube IFrame API script"));
				}
			});
			document.head.appendChild(script);
		}
	});

	return loadingPromise;
}

export function resetYouTubeIframeApiLoader(): void {
	loadingPromise = null;
}
