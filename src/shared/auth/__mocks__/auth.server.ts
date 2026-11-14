import { vi } from "vite-plus/test";

const auth = {
  api: {
    getSession: vi.fn<() => Promise<unknown>>().mockResolvedValue(null),
  },
  handler: vi.fn<() => Promise<Response>>(),
  options: {
    advanced: {
      ipAddress: {
        ipAddressHeaders: ["cf-connecting-ip"],
      },
    },
    baseURL: "http://localhost:5173",
    emailAndPassword: { enabled: true },
    rateLimit: {
      storage: "database",
    },
    secret: "test-secret-at-least-32-characters-long",
  },
};

export { auth };
