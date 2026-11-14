import { describe, expect, it } from "vite-plus/test";

import { useAppForm } from "../app-form";

describe("app form hook", () => {
  it("exports useAppForm hook", () => {
    expect.assertions(1);
    expect(useAppForm).toBeDefined();
  });
});
