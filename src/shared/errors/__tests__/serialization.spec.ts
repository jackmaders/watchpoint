import { describe, expect, it } from "vite-plus/test";

import { ApplicationError } from "../application-error";
import { applicationErrorAdapter } from "../serialization";

describe("application error serialization", () => {
  it.each([
    [new ApplicationError("TODO_NOT_FOUND"), true],
    [new Error("unknown failure"), false],
    [{ code: "TODO_NOT_FOUND" }, false],
  ])("recognizes application errors: %s", (value, expected) => {
    expect.assertions(1);

    // Act
    const matches = applicationErrorAdapter.test(value);

    // Assert
    expect(matches).toBe(expected);
  });

  it("sends only configured public error fields", () => {
    expect.assertions(1);
    // Arrange
    const error = new ApplicationError("TODO_NOT_FOUND", {
      cause: new Error("private cause"),
      details: { secret: "private details" },
      message: "private diagnostic message",
    });

    // Act
    const serialized = applicationErrorAdapter.toSerializable(error);

    // Assert
    expect(serialized).toStrictEqual({
      code: "TODO_NOT_FOUND",
      message: "Todo item not found.",
      name: "ApplicationError",
      statusCode: 404,
    });
  });

  it("restores an application error without server diagnostics", () => {
    expect.assertions(3);
    // Arrange
    const error = new ApplicationError("USER_FORBIDDEN");

    // Act
    const restored = applicationErrorAdapter.fromSerializable(
      applicationErrorAdapter.toSerializable(error),
    );

    // Assert
    expect(restored).toBeInstanceOf(ApplicationError);
    expect(restored).toMatchObject({
      code: "USER_FORBIDDEN",
      message: "Permission denied.",
      statusCode: 403,
    });
    expect(restored.details).toBeUndefined();
  });
});
