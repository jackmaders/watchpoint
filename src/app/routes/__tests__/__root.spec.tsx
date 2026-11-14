import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";

import { Route as RootRoute } from "@/app/routes/__root";
import { ErrorPage } from "@/pages/error";
import { NotFoundPage } from "@/pages/not-found";
import { getSessionFn } from "@/shared/auth";
import { TEST_SESSION } from "@test/vitest/fixtures/session";
import { getRouteOption } from "@test/vitest/helpers/route";
import { createTestingWrapper } from "@test/vitest/wrappers/testing-wrapper";

import appCss from "@/app/styles/index.css?url";

vi.mock(import("@/shared/auth"));
vi.mock(import("@/app/layouts"));
vi.mock(import("@/shared/ui/shadcn/toast"));

afterEach(() => {
  vi.restoreAllMocks();
});

describe("root route document metadata", () => {
  it("defines title, charset, viewport, and stylesheet metadata in head", () => {
    expect.assertions(4);

    // Arrange
    const head = getRouteOption(RootRoute, "head") as (ctx: never) => {
      meta?: Record<string, unknown>[];
      links?: Record<string, unknown>[];
    };

    // Act
    const result = head({} as never);

    // Assert
    expect(result.meta).toContainEqual({ title: "TanStack Start Starter" });
    expect(result.meta).toContainEqual({ charSet: "utf8" });
    expect(result.meta).toContainEqual({
      content: "width=device-width, initial-scale=1",
      name: "viewport",
    });
    expect(result.links).toContainEqual(
      expect.objectContaining({
        href: appCss,
        rel: "stylesheet",
      }),
    );
  });
});

describe("root route layout and shellComponent", () => {
  it("renders shell document with banner, main, contentinfo, and marks document hydrated", () => {
    expect.assertions(5);

    // Arrange
    const Shell = getRouteOption(RootRoute, "shellComponent") as React.ComponentType<{
      children?: React.ReactNode;
    }>;
    const { wrapper } = createTestingWrapper();

    // Act
    render(
      <Shell>
        <p>Child content</p>
      </Shell>,
      { container: document, wrapper },
    );

    // Assert
    expect(screen.getByRole("banner")).toBeDefined();
    expect(screen.getByRole("main")).toBeDefined();
    expect(screen.getByRole("contentinfo")).toBeDefined();
    expect(screen.getByText("Child content")).toBeDefined();
    expect(document.body.dataset["hydrated"]).toBe("true");
  });
});

describe("root route errorComponent and notFoundComponent", () => {
  it("configures ErrorPage as errorComponent and NotFoundPage as notFoundComponent", () => {
    expect.assertions(2);

    // Arrange
    const options = RootRoute.options as unknown as {
      errorComponent?: unknown;
      notFoundComponent?: unknown;
    };

    // Assert
    expect(options.errorComponent).toBe(ErrorPage);
    expect(options.notFoundComponent).toBe(NotFoundPage);
  });
});

describe("root route beforeLoad", () => {
  it("populates session context from getSessionFn when authenticated", async () => {
    expect.assertions(1);

    // Arrange
    vi.mocked(getSessionFn).mockResolvedValueOnce(TEST_SESSION);
    const beforeLoad = getRouteOption(RootRoute, "beforeLoad") as (ctx: never) => Promise<unknown>;

    // Act
    const context = await beforeLoad({} as never);

    // Assert
    expect(context).toStrictEqual({ session: TEST_SESSION });
  });

  it("populates null session context when unauthenticated", async () => {
    expect.assertions(1);

    // Arrange
    vi.mocked(getSessionFn).mockResolvedValueOnce(null);
    const beforeLoad = getRouteOption(RootRoute, "beforeLoad") as (ctx: never) => Promise<unknown>;

    // Act
    const context = await beforeLoad({} as never);

    // Assert
    expect(context).toStrictEqual({ session: null });
  });
});
