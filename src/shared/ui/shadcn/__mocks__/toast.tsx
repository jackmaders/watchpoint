import { vi } from "vite-plus/test";

const toast = {
  add: vi.fn<(...args: unknown[]) => string>(),
  close: vi.fn<(id: string) => void>(),
  promise: vi.fn<(...args: unknown[]) => unknown>(),
  update: vi.fn<(...args: unknown[]) => void>(),
};

function Toaster() {
  return <div />;
}

export { Toaster, toast };
