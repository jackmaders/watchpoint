import { vi } from "vite-plus/test";

const mockDb = {
  batch: vi.fn<() => Promise<unknown[]>>(),
  delete: vi.fn<() => unknown>(),
  insert: vi.fn<() => unknown>(),
  query: {},
  select: vi.fn<() => unknown>(),
  update: vi.fn<() => unknown>(),
};

const getDb = vi.fn<() => typeof mockDb>(() => mockDb);

export { getDb };
