import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vite-plus/test";

import { Route as AboutRoute } from "@/app/routes/about";

vi.mock(import("@/pages/about"));

describe("about route presentation", () => {
  it("renders AboutPage via Route component option", () => {
    expect.assertions(1);

    // Arrange
    const Component = AboutRoute.options.component as React.ComponentType;

    // Act
    render(<Component />);

    // Assert
    expect(screen.getByRole("heading", { name: "About Page" })).toBeDefined();
  });
});
