const YOUTUBE_IFRAME_API_URL = "https://www.youtube.com/iframe_api";

interface YouTubePlayerInstance {
  destroy: () => void;
  getCurrentTime: () => number;
  pauseVideo: () => void;
  playVideo: () => void;
  seekTo: (seconds: number, allowSeekAhead: boolean) => void;
}

interface YouTubePlayerReadyEvent {
  target?: YouTubePlayerInstance | undefined;
}

interface YouTubePlayerOptions {
  events: {
    onAutoplayBlocked: () => void;
    onError: (event: { data: number }) => void;
    onReady: (event?: YouTubePlayerReadyEvent) => void;
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

interface YouTubeApiLoadListener {
  onFailed: () => void;
  onLoaded: () => void;
}

interface PendingYouTubeApiLoad {
  abort: () => void;
  listeners: Set<YouTubeApiLoadListener>;
  script: HTMLScriptElement;
}

let pendingApiLoad: PendingYouTubeApiLoad | null = null;

function loadYouTubeIframeApi(listener: YouTubeApiLoadListener): () => void {
  if (pendingApiLoad && !pendingApiLoad.script.isConnected) {
    pendingApiLoad.abort();
  }

  const activeLoad = pendingApiLoad ?? startYouTubeApiLoad();
  activeLoad.listeners.add(listener);

  return () => {
    activeLoad.listeners.delete(listener);
  };
}

function startYouTubeApiLoad(): PendingYouTubeApiLoad {
  const listeners = new Set<YouTubeApiLoadListener>();
  const script = ensureYouTubeApiScript();
  let detachLoadHandlers: (() => void) | null = null;
  const activeLoad: PendingYouTubeApiLoad = {
    abort: () => {
      detachLoadHandlers?.();
    },
    listeners,
    script,
  };
  pendingApiLoad = activeLoad;
  detachLoadHandlers = attachYouTubeLoadHandlers({
    listeners,
    previousReady: window.onYouTubeIframeAPIReady,
    script,
  });
  return activeLoad;
}

function attachYouTubeLoadHandlers({
  listeners,
  previousReady,
  script,
}: {
  listeners: Set<YouTubeApiLoadListener>;
  previousReady: (() => void) | undefined;
  script: HTMLScriptElement;
}): () => void {
  function cleanupPendingLoad() {
    script.removeEventListener("error", handleScriptError);
    window.onYouTubeIframeAPIReady = previousReady;
    pendingApiLoad = null;
  }

  function handleScriptError() {
    cleanupPendingLoad();
    script.remove();
    notifyPendingListeners(listeners, "onFailed");
  }

  function handleApiReady() {
    cleanupPendingLoad();
    previousReady?.();
    notifyPendingListeners(listeners, "onLoaded");
  }

  script.addEventListener("error", handleScriptError, { once: true });
  window.onYouTubeIframeAPIReady = handleApiReady;
  return cleanupPendingLoad;
}

function notifyPendingListeners(
  listeners: Set<YouTubeApiLoadListener>,
  eventName: "onFailed" | "onLoaded",
) {
  for (const listener of listeners) {
    listener[eventName]();
  }
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

function createYouTubeApiScript(): HTMLScriptElement {
  const script = document.createElement("script");
  script.src = YOUTUBE_IFRAME_API_URL;
  script.async = true;
  return script;
}

export { loadYouTubeIframeApi, type YouTubePlayerInstance, type YouTubePlayerOptions };
