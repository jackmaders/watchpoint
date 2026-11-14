import { renderHook, waitFor } from "@testing-library/react";
import imageCompression from "browser-image-compression";
import { describe, expect, it, vi } from "vite-plus/test";

import { compressImage } from "@/shared/lib/compress-image.client";
import {
  TEST_COMPRESSED_IMAGE_FILE,
  TEST_IMAGE_DATA_URL,
  TEST_IMAGE_FILE,
  TEST_TEMP_IMAGE_KEY,
} from "@test/vitest/fixtures/images";
import { createTestingWrapper } from "@test/vitest/wrappers/testing-wrapper";

import { uploadTodoImageFn } from "../todos.functions";
import { useUploadTodoImage } from "../use-upload-todo-image";

vi.mock(import("browser-image-compression"));
vi.mock(import("@/shared/lib/compress-image.client"));
vi.mock(import("../todos.functions"));

describe("useUploadTodoImage mutation hook", () => {
  it("compresses the image, converts it to a data URL, and invokes uploadTodoImageFn", async () => {
    expect.hasAssertions();

    // Arrange
    vi.mocked(compressImage).mockResolvedValueOnce(TEST_COMPRESSED_IMAGE_FILE);
    vi.mocked(imageCompression.getDataUrlFromFile).mockResolvedValueOnce(TEST_IMAGE_DATA_URL);
    vi.mocked(uploadTodoImageFn).mockResolvedValueOnce({ tempKey: TEST_TEMP_IMAGE_KEY });
    const { wrapper } = createTestingWrapper();
    const { result } = renderHook(() => useUploadTodoImage(), { wrapper });

    // Act
    const response = await result.current.mutateAsync(TEST_IMAGE_FILE);

    // Assert
    expect(compressImage).toHaveBeenCalledWith(TEST_IMAGE_FILE);
    expect(imageCompression.getDataUrlFromFile).toHaveBeenCalledWith(TEST_COMPRESSED_IMAGE_FILE);
    expect(uploadTodoImageFn).toHaveBeenCalledWith({
      data: { base64: TEST_IMAGE_DATA_URL, contentType: "image/webp" },
    });
    expect(response).toStrictEqual({ tempKey: TEST_TEMP_IMAGE_KEY });
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
  });

  it("calls custom onSuccess callback when provided", async () => {
    expect.assertions(1);

    // Arrange
    vi.mocked(compressImage).mockResolvedValueOnce(TEST_COMPRESSED_IMAGE_FILE);
    vi.mocked(imageCompression.getDataUrlFromFile).mockResolvedValueOnce(TEST_IMAGE_DATA_URL);
    vi.mocked(uploadTodoImageFn).mockResolvedValueOnce({ tempKey: TEST_TEMP_IMAGE_KEY });
    const customOnSuccess = vi.fn<() => void>();
    const { wrapper } = createTestingWrapper();
    const { result } = renderHook(() => useUploadTodoImage({ onSuccess: customOnSuccess }), {
      wrapper,
    });

    // Act
    await result.current.mutateAsync(TEST_IMAGE_FILE);

    // Assert
    expect(customOnSuccess).toHaveBeenCalledOnce();
  });
});
