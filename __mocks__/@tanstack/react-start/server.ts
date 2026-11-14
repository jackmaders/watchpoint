import { vi } from "vite-plus/test";

const getRequestHeaders = vi.fn<() => Headers>(() => new globalThis.Headers());

export { getRequestHeaders };
