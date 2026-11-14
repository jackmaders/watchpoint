import { vi } from "vite-plus/test";

const signIn = {
  email: vi.fn<(...args: unknown[]) => Promise<unknown>>(),
};
const signOut = vi.fn<(...args: unknown[]) => Promise<unknown>>().mockResolvedValue({});
const signUp = {
  email: vi.fn<(...args: unknown[]) => Promise<unknown>>(),
};
const useSession = vi
  .fn<
    () => {
      data: unknown;
      error: unknown;
      isPending: boolean;
      refetch: () => Promise<unknown>;
    }
  >()
  .mockReturnValue({
    data: null,
    error: null,
    isPending: false,
    refetch: vi.fn<() => Promise<unknown>>().mockResolvedValue(null),
  });
const authClient = {
  signIn,
  signOut,
  signUp,
  useSession,
};
const mockAuthClient = authClient;

export { authClient, mockAuthClient, signIn, signOut, signUp, useSession };
