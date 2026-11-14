import { CancelledError, QueryClient } from "@tanstack/react-query";
import { setupRouterSsrQueryIntegration } from "@tanstack/react-router-ssr-query";
import { describe, expect, it, vi } from "vite-plus/test";

import { getRouter } from "@/app/router";
import { ApplicationError } from "@/shared/errors";
import { toast } from "@/shared/ui/shadcn/toast";

vi.mock(import("@tanstack/react-router-ssr-query"));
vi.mock(import("@/shared/ui/shadcn/toast"));

describe("router route matching", () => {
  it("matches the home page within the root document", () => {
    expect.assertions(1);

    // Act
    const router = getRouter();
    const matches = router.matchRoutes("/");

    // Assert
    expect(matches.map((match) => match.routeId)).toStrictEqual(["__root__", "/"]);
  });

  it("matches the about page within the root document", () => {
    expect.assertions(1);

    // Act
    const router = getRouter();
    const matches = router.matchRoutes("/about");

    // Assert
    expect(matches.map((match) => match.routeId)).toStrictEqual(["__root__", "/about"]);
  });

  it("does not match a page for unknown paths", () => {
    expect.assertions(1);

    // Act
    const router = getRouter();
    const matches = router.matchRoutes("/missing");

    // Assert
    expect(matches.map((match) => match.routeId)).toStrictEqual(["__root__"]);
  });
});

describe("router auth route matching", () => {
  it("matches the profile page within authenticated layout", () => {
    expect.assertions(1);

    // Act
    const router = getRouter();
    const matches = router.matchRoutes("/profile");

    // Assert
    expect(matches.map((match) => match.routeId)).toStrictEqual([
      "__root__",
      "/_authenticated",
      "/_authenticated/profile",
    ]);
  });

  it("matches api auth splat routes within the root document", () => {
    expect.assertions(1);

    // Act
    const router = getRouter();
    const matches = router.matchRoutes("/api/auth/sign-in");

    // Assert
    expect(matches.map((match) => match.routeId)).toStrictEqual(["__root__", "/api/auth/$"]);
  });

  it("matches api images splat routes within the root document", () => {
    expect.assertions(1);

    // Act
    const router = getRouter();
    const matches = router.matchRoutes("/api/images/todos/todo-1/pic.webp");

    // Assert
    expect(matches.map((match) => match.routeId)).toStrictEqual(["__root__", "/api/images/$"]);
  });
});

describe("router instance isolation", () => {
  it("creates independent routers so changing one does not affect another", () => {
    expect.assertions(3);

    // Arrange
    const first = getRouter();
    const second = getRouter();

    // Act
    first.update({
      context: first.options.context,
      defaultPreload: "render",
    });

    // Assert
    expect(first).not.toBe(second);
    expect(first.options.defaultPreload).toBe("render");
    expect(second.options.defaultPreload).toBe("intent");
  });
});

describe("router query integration", () => {
  it("exposes queryClient on the router context", () => {
    expect.assertions(1);

    // Act
    const router = getRouter();
    const { queryClient } = router.options.context;

    // Assert
    expect(queryClient).toBeInstanceOf(QueryClient);
  });

  it("isolates queryClient instances across router calls", () => {
    expect.assertions(1);

    // Arrange
    const first = getRouter();
    const second = getRouter();

    // Act
    const { queryClient: firstClient } = first.options.context;
    const { queryClient: secondClient } = second.options.context;

    // Assert
    expect(firstClient).not.toBe(secondClient);
  });

  it("executes setupRouterSsrQueryIntegration with queryClient and router", () => {
    expect.assertions(1);

    // Act
    const router = getRouter();

    // Assert
    expect(setupRouterSsrQueryIntegration).toHaveBeenCalledWith({
      queryClient: router.options.context.queryClient,
      router,
    });
  });
});

describe("api failure notifications", () => {
  it("toasts mutation errors and preserves rejection and custom callbacks", async () => {
    expect.hasAssertions();
    // Arrange
    const client = getRouter().options.context.queryClient;
    const apiError = new ApplicationError("TODO_CREATE_FAILED");
    const onError = vi.fn<() => void>();
    const mutation = client.getMutationCache().build(client, {
      mutationFn: vi.fn<() => Promise<never>>().mockRejectedValue(apiError),
      onError,
    });

    // Act
    const failure = await mutation.execute({}).catch((error: unknown) => error);

    // Assert
    expect(failure).toBe(apiError);
    expect(onError).toHaveBeenCalledOnce();
    expect(toast.add).toHaveBeenCalledExactlyOnceWith({ title: apiError.message, type: "error" });
  });

  it("does not toast cancelled mutation errors", async () => {
    expect.hasAssertions();
    // Arrange
    const client = getRouter().options.context.queryClient;
    const cancellation = new CancelledError();
    const mutation = client.getMutationCache().build(client, {
      mutationFn: vi.fn<() => Promise<never>>().mockRejectedValue(cancellation),
    });

    // Act
    const failure = await mutation.execute({}).catch((error: unknown) => error);

    // Assert
    expect(failure).toBe(cancellation);
    expect(toast.add).not.toHaveBeenCalled();
  });

  it("leaves initial query errors to the route error boundary", async () => {
    expect.hasAssertions();
    // Arrange
    const client = getRouter().options.context.queryClient;
    const apiError = new Error("Network unavailable");

    // Act
    const failure = await client
      .query({
        queryFn: vi.fn<() => Promise<never>>().mockRejectedValue(apiError),
        queryKey: ["initial"],
        retry: false,
      })
      .catch((error: unknown) => error);

    // Assert
    expect(failure).toBe(apiError);
    expect(toast.add).not.toHaveBeenCalled();
  });

  it("toasts background query errors while preserving cached data", async () => {
    expect.hasAssertions();
    // Arrange
    const client = getRouter().options.context.queryClient;
    const queryKey = ["cached"];
    client.setQueryData(queryKey, ["saved"]);
    const apiError = new Error("Refetch failed");

    // Act
    const failure = await client
      .query({
        queryFn: vi.fn<() => Promise<never>>().mockRejectedValue(apiError),
        queryKey,
        retry: false,
        staleTime: 0,
      })
      .catch((error: unknown) => error);

    // Assert
    expect(failure).toBeInstanceOf(Error);
    expect(client.getQueryData(queryKey)).toStrictEqual(["saved"]);
    expect(toast.add).toHaveBeenCalledExactlyOnceWith({
      title: apiError.message,
      type: "error",
    });
  });
});
