import { vi } from "vite-plus/test";

const getSessionFn = vi.fn<() => Promise<unknown>>().mockResolvedValue(null);

export { getSessionFn };
