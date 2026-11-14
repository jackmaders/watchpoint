import { describe, expect, it } from "vite-plus/test";

import { ApplicationError } from "../application-error";

describe("application errors", () => {
  it.each([
    ["INTERNAL_SERVER_ERROR", "Something went wrong.", 500],
    ["TODO_CREATE_FAILED", "Todo item could not be created.", 500],
    ["TODO_NOT_FOUND", "Todo item not found.", 404],
    ["USER_FORBIDDEN", "Permission denied.", 403],
    ["USER_UNAUTHENTICATED", "Not Authenticated.", 401],
  ] as const)("configures %s", (code, message, statusCode) => {
    expect.assertions(1);

    // Act
    const error = new ApplicationError(code);

    // Assert
    expect(error).toMatchObject({ code, message, name: "ApplicationError", statusCode });
  });

  it("preserves custom messages, details, and causes", () => {
    expect.assertions(1);
    // Arrange
    const cause = new Error("Database unavailable");
    const details = { todoId: "missing-todo" };

    // Act
    const error = new ApplicationError("TODO_CREATE_FAILED", {
      cause,
      details,
      message: "Please retry later.",
    });

    // Assert
    expect(error).toMatchObject({ cause, details, message: "Please retry later." });
  });

  it("uses the configured message when the override is empty", () => {
    expect.assertions(1);

    // Act
    const error = new ApplicationError("TODO_NOT_FOUND", { message: "" });

    // Assert
    expect(error.message).toBe("Todo item not found.");
  });

  it("serializes public error fields without the cause or stack", () => {
    expect.assertions(1);
    // Arrange
    const error = new ApplicationError("TODO_NOT_FOUND", {
      cause: new Error("Private database details"),
      details: { todoId: "missing-todo" },
    });

    // Act
    const serialized = JSON.stringify(error);

    // Assert
    expect(serialized).toBe(
      JSON.stringify({
        code: "TODO_NOT_FOUND",
        message: "Todo item not found.",
        name: "ApplicationError",
        statusCode: 404,
      }),
    );
  });
});
