import { describe, expect, it, vi } from "vite-plus/test";

import { Route } from "@/app/routes/api/auth/$";
import { auth } from "@/shared/auth/index.server";

type AuthServerRouteHandler = ({ request }: { request: Request }) => Promise<Response>;

function getHandlers() {
  const { server } = Route.options;
  if (!server) {
    throw new TypeError("Expected server options to be defined");
  }
  const { handlers } = server;
  if (!handlers) {
    throw new TypeError("Expected handlers to be defined");
  }
  return handlers as Record<string, AuthServerRouteHandler>;
}

function getRouteHandler(method: "GET" | "POST"): AuthServerRouteHandler {
  const handler = getHandlers()[method];
  if (!handler) {
    throw new TypeError(`Expected ${method} handler to be defined`);
  }
  return handler;
}

describe("api auth route handlers", () => {
  it("forwards GET requests to the Better Auth handler", async () => {
    expect.assertions(2);

    // Arrange
    const request = new Request("http://localhost:5173/api/auth/ok");
    const expectedResponse = Response.json({ status: "ok" });
    vi.mocked(auth.handler).mockResolvedValueOnce(expectedResponse);
    const getHandler = getRouteHandler("GET");

    // Act
    const response = await getHandler({ request });

    // Assert
    expect(auth.handler).toHaveBeenCalledWith(request);
    expect(response).toBe(expectedResponse);
  });

  it("forwards POST requests to the Better Auth handler", async () => {
    expect.assertions(2);

    // Arrange
    const request = new Request("http://localhost:5173/api/auth/sign-in/email", {
      method: "POST",
    });
    const expectedResponse = Response.json({ success: true });
    vi.mocked(auth.handler).mockResolvedValueOnce(expectedResponse);
    const postHandler = getRouteHandler("POST");

    // Act
    const response = await postHandler({ request });

    // Assert
    expect(auth.handler).toHaveBeenCalledWith(request);
    expect(response).toBe(expectedResponse);
  });
});
