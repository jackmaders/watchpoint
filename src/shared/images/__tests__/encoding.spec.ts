import { describe, expect, it } from "vite-plus/test";

import { decodeBase64ToArrayBuffer } from "../encoding";

describe("decodeBase64ToArrayBuffer utility", () => {
  it("decodes a raw base64 string into an ArrayBuffer", () => {
    expect.assertions(1);

    // Arrange
    const input = "AQID";

    // Act
    const buffer = decodeBase64ToArrayBuffer(input);
    const bytes = new Uint8Array(buffer);

    // Assert
    expect(bytes).toStrictEqual(new Uint8Array([1, 2, 3]));
  });

  it("strips data URL prefix before decoding into an ArrayBuffer", () => {
    expect.assertions(1);

    // Arrange
    const input = "data:image/webp;base64,BAUG";

    // Act
    const buffer = decodeBase64ToArrayBuffer(input);
    const bytes = new Uint8Array(buffer);

    // Assert
    expect(bytes).toStrictEqual(new Uint8Array([4, 5, 6]));
  });
});
