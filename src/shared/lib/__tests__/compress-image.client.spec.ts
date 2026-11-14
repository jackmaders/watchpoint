import imageCompression from "browser-image-compression";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";

import {
  ACCEPTED_IMAGE_TYPES,
  compressImage,
  ImageCompressionError,
  MAX_IMAGE_DIMENSION,
  MAX_IMAGE_SIZE_BYTES,
  WEBP_QUALITY,
} from "../compress-image.client";

vi.mock(import("browser-image-compression"));

describe("compressImage client utility", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("constants", () => {
    it("exports expected accepted image types", () => {
      expect.hasAssertions();
      // Assert
      expect(ACCEPTED_IMAGE_TYPES).toStrictEqual([
        "image/jpeg",
        "image/png",
        "image/webp",
        "image/avif",
      ]);
    });

    it("exports expected dimension, size, and quality limits", () => {
      expect.hasAssertions();
      // Assert
      expect(MAX_IMAGE_DIMENSION).toBe(1600);
      expect(MAX_IMAGE_SIZE_BYTES).toBe(10 * 1024 * 1024);
      expect(WEBP_QUALITY).toBe(0.8);
    });
  });

  describe("accepted file formats", () => {
    it.each([
      ["image/jpeg", "sample.jpeg"],
      ["image/png", "sample.png"],
      ["image/webp", "sample.webp"],
      ["image/avif", "sample.avif"],
      ["image/jpg", "sample.jpg"],
    ])("accepts %s files and compresses with fixed parameters", async (mimeType, fileName) => {
      expect.hasAssertions();
      // Arrange
      const file = new File(["valid-content"], fileName, { type: mimeType });
      const mockCompressedFile = new File(["compressed"], "output.webp", { type: "image/webp" });
      vi.mocked(imageCompression).mockResolvedValueOnce(mockCompressedFile);

      // Act
      const result = await compressImage(file);

      // Assert
      expect(result).toBe(mockCompressedFile);
      expect(imageCompression).toHaveBeenCalledWith(file, {
        fileType: "image/webp",
        initialQuality: WEBP_QUALITY,
        maxSizeMB: 10,
        maxWidthOrHeight: MAX_IMAGE_DIMENSION,
        useWebWorker: true,
      });
    });
  });

  describe("file size limits", () => {
    it("accepts file at maximum 10MB limit", async () => {
      expect.hasAssertions();
      // Arrange
      const file = new File(["content"], "boundary.png", { type: "image/png" });
      Object.defineProperty(file, "size", { value: MAX_IMAGE_SIZE_BYTES });
      const mockCompressedFile = new File(["compressed"], "output.webp", { type: "image/webp" });
      vi.mocked(imageCompression).mockResolvedValueOnce(mockCompressedFile);

      // Act
      const result = await compressImage(file);

      // Assert
      expect(result).toBe(mockCompressedFile);
    });

    it("rejects files exceeding 10MB limit with FILE_TOO_LARGE error", async () => {
      expect.hasAssertions();
      // Arrange
      const file = new File(["oversized"], "huge.png", { type: "image/png" });
      Object.defineProperty(file, "size", { value: MAX_IMAGE_SIZE_BYTES + 1 });

      // Act
      const failure = await compressImage(file).catch((error: unknown) => error);

      // Assert
      expect(failure).toBeInstanceOf(ImageCompressionError);
      expect(failure).toMatchObject({
        code: "FILE_TOO_LARGE",
        message: "File size exceeds the 10MB limit.",
        name: "ImageCompressionError",
      });
      expect(imageCompression).not.toHaveBeenCalled();
    });
  });

  describe("format validation error handling", () => {
    it.each([
      ["image/svg+xml", "vector.svg"],
      ["application/pdf", "document.pdf"],
      ["image/gif", "animation.gif"],
      ["text/plain", "notes.txt"],
    ])(
      "rejects unsupported MIME type %s with INVALID_FILE_TYPE error",
      async (mimeType, fileName) => {
        expect.hasAssertions();
        // Arrange
        const file = new File(["content"], fileName, { type: mimeType });

        // Act
        const failure = await compressImage(file).catch((error: unknown) => error);

        // Assert
        expect(failure).toBeInstanceOf(ImageCompressionError);
        expect(failure).toMatchObject({
          code: "INVALID_FILE_TYPE",
          message: `Unsupported file format "${mimeType}". Please upload a JPEG, PNG, WebP, or AVIF image.`,
          name: "ImageCompressionError",
        });
        expect(imageCompression).not.toHaveBeenCalled();
      },
    );
  });

  describe("compression failure translation", () => {
    it.each([
      [new Error("Canvas export failed"), "CANVAS_CONTEXT_UNAVAILABLE"],
      [new Error("2D context unavailable"), "CANVAS_CONTEXT_UNAVAILABLE"],
      [new Error("Failed to call getContext"), "CANVAS_CONTEXT_UNAVAILABLE"],
      [new Error("Unexpected decode failure"), "IMAGE_LOAD_FAILED"],
      ["non-error-rejection", "IMAGE_LOAD_FAILED"],
    ])("translates failure %s to %s code", async (rejectionValue, expectedCode) => {
      expect.hasAssertions();
      // Arrange
      const file = new File(["valid"], "sample.png", { type: "image/png" });
      vi.mocked(imageCompression).mockRejectedValueOnce(rejectionValue);

      // Act
      const failure = await compressImage(file).catch((error: unknown) => error);

      // Assert
      expect(failure).toBeInstanceOf(ImageCompressionError);
      expect(failure).toMatchObject({
        code: expectedCode,
        name: "ImageCompressionError",
      });
    });
  });
});
