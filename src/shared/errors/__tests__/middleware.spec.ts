import { notFound, redirect } from "@tanstack/react-router";
import { describe, expect, it, vi } from "vite-plus/test";

import { ApplicationError } from "../application-error";
import { logger } from "../logger";
import { errorMiddleware } from "../middleware";

vi.mock(import("../logger"));

async function runMiddleware(next: () => Promise<unknown>) {
  const { server } = errorMiddleware.options;
  if (!server) {
    throw new TypeError("Expected server middleware to be defined");
  }
  return await server({ context: {}, next } as unknown as Parameters<typeof server>[0]);
}

describe("error middleware", () => {
  it("returns the downstream result", async () => {
    expect.assertions(1);
    // Arrange
    const result = { result: "saved" };

    // Act
    const actual = await runMiddleware(vi.fn<() => Promise<unknown>>().mockResolvedValue(result));

    // Assert
    expect(actual).toBe(result);
  });

  it.each(["TODO_NOT_FOUND", "TODO_CREATE_FAILED"] as const)(
    "preserves %s application errors",
    async (code) => {
      expect.assertions(1);
      // Arrange
      const error = new ApplicationError(code);

      // Act
      const result = runMiddleware(vi.fn<() => Promise<unknown>>().mockRejectedValue(error));

      // Assert
      await expect(result).rejects.toBe(error);
    },
  );

  it("translates unknown failures and preserves their cause", async () => {
    expect.assertions(1);
    // Arrange
    const error = new Error("private database details");

    // Act
    const result = runMiddleware(vi.fn<() => Promise<unknown>>().mockRejectedValue(error));

    // Assert
    await expect(result).rejects.toMatchObject({
      cause: error,
      code: "INTERNAL_SERVER_ERROR",
      message: "Something went wrong.",
    });
  });

  it.each([
    ["redirect", redirect({ to: "/" })],
    ["not found", notFound()],
  ])("preserves %s control flow without logging a failure", async (_name, signal) => {
    expect.assertions(3);
    // Arrange
    const next = vi.fn<() => Promise<unknown>>().mockRejectedValue(signal);

    // Act
    const result = runMiddleware(next);

    // Assert
    await expect(result).rejects.toBe(signal);
    expect(logger.error).not.toHaveBeenCalled();
    expect(logger.warn).not.toHaveBeenCalled();
  });
});
