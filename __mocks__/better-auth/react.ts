import type {
  createAuthClient as actualCreateAuthClient,
  useStore as actualUseStore,
} from "better-auth/react";
import { vi } from "vite-plus/test";

const mockClient = {
  signIn: vi.fn<() => void>(),
  signOut: vi.fn<() => void>(),
  signUp: vi.fn<() => void>(),
  useSession: vi.fn<() => void>(),
};

const createAuthClient = vi.fn<() => typeof mockClient>(
  () => mockClient,
) as unknown as typeof actualCreateAuthClient;
const useStore = vi.fn<() => void>() as unknown as typeof actualUseStore;

export { createAuthClient, useStore };
