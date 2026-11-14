import { cleanup } from "@testing-library/react";
import { afterAll, afterEach, vi } from "vite-plus/test";

vi.mock(import("@/shared/auth/auth.server"));
vi.mock(import("@/shared/db/db.server"));

afterEach(cleanup);

afterAll(() => {
  vi.resetModules();
});
