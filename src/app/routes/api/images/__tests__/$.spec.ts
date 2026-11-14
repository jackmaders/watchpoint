import { describe, expect, it, vi } from "vite-plus/test";

import { Route } from "@/app/routes/api/images/$";
import { getImage } from "@/shared/images/index.server";
import { createMockR2Object } from "@test/vitest/fixtures/images";

interface ImageRouteRequestContext {
  params?: {
    _splat?: string | undefined;
  };
  request: Request;
}

type ImageServerRouteHandler = (context: ImageRouteRequestContext) => Promise<Response>;

function getGetHandler(): ImageServerRouteHandler {
  const { server } = Route.options;
  if (!server?.handlers) {
    throw new TypeError("Expected server handlers to be defined");
  }
  const handlers = server.handlers as Record<string, ImageServerRouteHandler>;
  const getHandler = handlers["GET"];
  if (!getHandler) {
    throw new TypeError("Expected GET handler to be defined");
  }
  return getHandler;
}

describe("api images route handler", () => {
  it("streams image from R2 with immutable cache, Content-Type, and ETag headers", async () => {
    expect.assertions(5);

    // Arrange
    const mockObject = createMockR2Object();
    vi.mocked(getImage).mockResolvedValueOnce(mockObject);
    const getHandler = getGetHandler();
    const request = new Request("http://localhost:5173/api/images/todos/123/image.webp");

    // Act
    const response = await getHandler({
      params: { _splat: "todos/123/image.webp" },
      request,
    });
    const bodyBytes = new Uint8Array(await response.arrayBuffer());

    // Assert
    expect(getImage).toHaveBeenCalledWith("todos/123/image.webp");
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("public, max-age=31536000, immutable");
    expect(response.headers.get("Content-Type")).toBe("image/webp");
    expect(bodyBytes).toStrictEqual(new Uint8Array([1, 2, 3, 4]));
  });

  it("falls back to URL pathname extraction and defaults Content-Type to image/webp when metadata is absent", async () => {
    expect.assertions(3);

    // Arrange
    const mockObject = createMockR2Object({ httpMetadata: {} });
    vi.mocked(getImage).mockResolvedValueOnce(mockObject);
    const getHandler = getGetHandler();
    const request = new Request("http://localhost:5173/api/images/temp/user-1/draft.webp");

    // Act
    const response = await getHandler({ request });

    // Assert
    expect(getImage).toHaveBeenCalledWith("temp/user-1/draft.webp");
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("image/webp");
  });

  it("returns 304 Not Modified when If-None-Match matches the R2 object ETag", async () => {
    expect.assertions(3);

    // Arrange
    const mockObject = createMockR2Object({ httpEtag: '"etag-match"' });
    vi.mocked(getImage).mockResolvedValueOnce(mockObject);
    const getHandler = getGetHandler();
    const request = new Request("http://localhost:5173/api/images/todos/123/image.webp", {
      headers: { "if-none-match": '"etag-match"' },
    });

    // Act
    const response = await getHandler({
      params: { _splat: "todos/123/image.webp" },
      request,
    });

    // Assert
    expect(response.status).toBe(304);
    expect(response.headers.get("ETag")).toBe('"etag-match"');
    expect(response.headers.get("Cache-Control")).toBe("public, max-age=31536000, immutable");
  });

  it("returns 404 when image key is empty or object is not found in R2", async () => {
    expect.assertions(2);

    // Arrange
    vi.mocked(getImage).mockResolvedValueOnce(null);
    const getHandler = getGetHandler();

    // Act
    const emptyKeyResponse = await getHandler({
      params: { _splat: "" },
      request: new Request("http://localhost:5173/api/images/"),
    });
    const missingObjectResponse = await getHandler({
      params: { _splat: "todos/123/missing.webp" },
      request: new Request("http://localhost:5173/api/images/todos/123/missing.webp"),
    });

    // Assert
    expect(emptyKeyResponse.status).toBe(404);
    expect(missingObjectResponse.status).toBe(404);
  });
});
