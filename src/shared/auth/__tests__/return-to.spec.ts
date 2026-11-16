import { describe, expect, it } from "vite-plus/test";

import { getInternalReturnTo } from "../return-to";

describe("internal return destination", () => {
  it("preserves internal paths, query, and hash", () => {
    expect.assertions(1);
    // Act
    const result = getInternalReturnTo("/vods/example?role=Support#prompt");

    // Assert
    expect(result).toBe("/vods/example?role=Support#prompt");
  });

  it.each([
    "https://outside.example/path",
    "//outside.example/path",
    "/a/..//outside.example/path",
    "/%2e%2e//outside.example/path",
    String.raw`/\[`,
  ])("falls back for non-internal destinations: %s", (value) => {
    expect.assertions(1);
    // Act
    const result = getInternalReturnTo(value);

    // Assert
    expect(result).toBe("/vods");
  });
});
