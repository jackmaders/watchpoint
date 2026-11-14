import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vite-plus/test";

import { Devtools } from "../devtools";

vi.mock(import("@tanstack/react-devtools"));
vi.mock(import("@tanstack/react-router-devtools"));
vi.mock(import("@tanstack/react-query-devtools"));

describe("devtools", () => {
  it("renders router and react-query panels", () => {
    expect.assertions(2);

    // Arrange & Act
    render(<Devtools />);

    // Assert
    expect(screen.getByText("Router Devtools Panel")).toBeDefined();
    expect(screen.getByText("React Query Devtools Panel")).toBeDefined();
  });
});
