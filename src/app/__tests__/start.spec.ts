import { createCsrfMiddleware } from "@tanstack/react-start";
import { describe, expect, it, vi } from "vite-plus/test";

import { applicationErrorAdapter, errorMiddleware } from "@/shared/errors";

import { startInstance } from "../start";

vi.mock(import("@tanstack/react-start"), { spy: true });

describe("start middleware configuration", () => {
  it("registers application error transport", async () => {
    expect.assertions(1);

    // Act
    const options = await startInstance.getOptions();

    // Assert
    expect(options.serializationAdapters).toStrictEqual([applicationErrorAdapter]);
  });

  it("registers global server-function error handling", async () => {
    expect.assertions(1);

    // Act
    const options = await startInstance.getOptions();

    // Assert
    expect(options.functionMiddleware).toStrictEqual([errorMiddleware]);
  });

  it.each([
    ["serverFn", true],
    ["router", false],
  ] as const)("applies CSRF validation to %s requests: %s", async (handlerType, expected) => {
    expect.assertions(1);
    // Arrange
    await startInstance.getOptions();
    const filter = getCsrfFilter();
    const context = { handlerType } as Parameters<typeof filter>[0];

    // Act
    const shouldValidate = await filter(context);

    // Assert
    expect(shouldValidate).toBe(expected);
  });
});

function getCsrfFilter() {
  const filter = vi.mocked(createCsrfMiddleware).mock.calls.at(-1)?.[0]?.filter;
  if (!filter) {
    throw new TypeError("Expected CSRF middleware to have a request filter");
  }
  return filter;
}
