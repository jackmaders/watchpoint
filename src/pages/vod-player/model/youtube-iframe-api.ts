const YOUTUBE_IFRAME_API_URL = "https://www.youtube.com/iframe_api";

interface YouTubePlayerInstance {
  destroy: () => void;
  getCurrentTime: () => number;
  pauseVideo: () => void;
  playVideo: () => void;
  seekTo: (seconds: number, allowSeekAhead: boolean) => void;
}

interface YouTubePlayerOptions {
  events: {
    onAutoplayBlocked: () => void;
    onError: (event: { data: number }) => void;
    onReady: () => void;
    onStateChange: (event: { data: number }) => void;
  };
  host: string;
  playerVars: {
    controls: number;
    enablejsapi: number;
    origin: string;
    playsinline: number;
    rel: number;
  };
  videoId: string;
}

interface YouTubeNamespace {
  Player: new (
    element: HTMLElement | string,
    options: YouTubePlayerOptions,
  ) => YouTubePlayerInstance;
}

declare global {
  interface Window {
    YT?: YouTubeNamespace | undefined;
    onYouTubeIframeAPIReady?: (() => void) | undefined;
  }
}

function createYouTubeApiScript(): HTMLScriptElement {
  const script = document.createElement("script");
  script.src = YOUTUBE_IFRAME_API_URL;
  script.async = true;
  return script;
}

function ensureYouTubeApiScript(): HTMLScriptElement {
  const existingScript = document.querySelector<HTMLScriptElement>(
    `script[src="${YOUTUBE_IFRAME_API_URL}"]`,
  );
  if (existingScript) {
    return existingScript;
  }

  const script = createYouTubeApiScript();
  document.head.insertBefore(script, null);
  return script;
}

function loadYouTubeIframeApi({
  onFailed,
  onLoaded,
}: {
  onFailed: () => void;
  onLoaded: () => void;
}): () => void {
  let cancelled = false;
  const script = ensureYouTubeApiScript();

  function handleScriptError() {
    cancelled = true;
    script.remove();
    onFailed();
  }

  script.addEventListener("error", handleScriptError, { once: true });

  const previousReady = window.onYouTubeIframeAPIReady;
  window.onYouTubeIframeAPIReady = () => {
    previousReady?.();
    script.removeEventListener("error", handleScriptError);
    if (!cancelled) {
      cancelled = true;
      onLoaded();
    }
  };

  return () => {
    cancelled = true;
    script.removeEventListener("error", handleScriptError);
  };
}

export { loadYouTubeIframeApi, type YouTubePlayerInstance, type YouTubePlayerOptions };
