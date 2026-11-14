import { vi } from "vite-plus/test";

import type { CreateYouTubeVodPlayerAdapterOptions, VodPlayerAdapter } from "../vod-player-adapter";

const createYouTubeVodPlayerAdapter = vi.fn<
  (options: CreateYouTubeVodPlayerAdapterOptions) => VodPlayerAdapter
>(() => ({
  destroy: vi.fn<() => void>(),
  getCurrentTime: vi.fn<() => number>(() => 0),
  load: vi.fn<(videoId: string) => void>(),
  pause: vi.fn<() => void>(),
  play: vi.fn<() => void>(),
  seekTo: vi.fn<(timeSec: number) => void>(),
}));

export { createYouTubeVodPlayerAdapter };
