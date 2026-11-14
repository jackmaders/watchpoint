import { vi } from "vite-plus/test";

const ensureSession = vi.fn<() => Promise<unknown>>().mockResolvedValue(null);
const getSession = vi.fn<() => Promise<unknown>>().mockResolvedValue(null);

export { ensureSession, getSession };
