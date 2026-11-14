import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vite-plus/test";

import { Route as IndexRoute } from "@/app/routes/index";
import { TEST_SESSION } from "@test/vitest/fixtures/session";
import { getRouteOption } from "@test/vitest/helpers/route";

vi.mock(import("@/pages/home"));

describe("index route beforeLoad guard", () => {
  it("redirects authenticated user to /todos", () => {
    expect.assertions(1);

    // Arrange
    const beforeLoad = getRouteOption(IndexRoute, "beforeLoad") as (ctx: unknown) => unknown;
    const args = { context: { session: TEST_SESSION } };

    // Assert
    expect(() => {
      beforeLoad(args);
    }).toThrow(
      expect.objectContaining({
        options: expect.objectContaining({ to: "/todos" }) as unknown,
      }),
    );
  });

  it("does not redirect unauthenticated user", () => {
    expect.assertions(1);

    // Arrange
    const beforeLoad = getRouteOption(IndexRoute, "beforeLoad") as (ctx: unknown) => unknown;
    const args = { context: { session: null } };

    // Assert
    expect(() => {
      beforeLoad(args);
    }).not.toThrow();
  });
});

describe("index route presentation", () => {
  it("renders HomePage via Route component option", () => {
    expect.assertions(1);

    // Arrange
    const Component = getRouteOption(IndexRoute, "component") as React.ComponentType;

    // Act
    render(<Component />);

    // Assert
    expect(screen.getByRole("heading", { name: "Home Page" })).toBeDefined();
  });
});
