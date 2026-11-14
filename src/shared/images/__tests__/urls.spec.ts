import { describe, expect, it } from "vite-plus/test";

import { getImageUrl } from "../urls";

describe("getImageUrl utility", () => {
  it("returns null when imageKey is null", () => {
    expect.assertions(1);

    // Act
    const result = getImageUrl(null);

    // Assert
    expect(result).toBeNull();
  });

  it("returns null when imageKey is undefined", () => {
    expect.assertions(2);

    // Arrange
    const undefinedKey: string | undefined = undefined;

    // Act & Assert
    expect(getImageUrl(undefinedKey)).toBeNull();
    expect(getImageUrl()).toBeNull();
  });

  it("returns null when imageKey is an empty string", () => {
    expect.assertions(1);

    // Act
    const result = getImageUrl("");

    // Assert
    expect(result).toBeNull();
  });

  it("returns the image URL for a normal imageKey", () => {
    expect.assertions(1);

    // Arrange
    const imageKey = "todos/550e8400-e29b-41d4-a716-446655440000/photo.webp";

    // Act
    const result = getImageUrl(imageKey);

    // Assert
    expect(result).toBe("/api/images/todos/550e8400-e29b-41d4-a716-446655440000/photo.webp");
  });

  it("strips single leading slash from imageKey", () => {
    expect.assertions(1);

    // Act
    const result = getImageUrl("/todos/550e8400-e29b-41d4-a716-446655440000/photo.webp");

    // Assert
    expect(result).toBe("/api/images/todos/550e8400-e29b-41d4-a716-446655440000/photo.webp");
  });

  it("strips multiple leading slashes from imageKey", () => {
    expect.assertions(1);

    // Act
    const result = getImageUrl("///todos/550e8400-e29b-41d4-a716-446655440000/photo.webp");

    // Assert
    expect(result).toBe("/api/images/todos/550e8400-e29b-41d4-a716-446655440000/photo.webp");
  });
});
