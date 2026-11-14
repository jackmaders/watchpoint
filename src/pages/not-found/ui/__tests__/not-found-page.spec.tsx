import { screen } from "@testing-library/react";
import { describe, expect, it } from "vite-plus/test";

import { renderWithProviders } from "@test/vitest/wrappers/testing-wrapper";

import { NotFoundPage } from "../not-found-page";

describe("not found page", () => {
  it("renders heading and link back to home", () => {
    expect.assertions(3);

    renderWithProviders(<NotFoundPage />);

    expect(screen.getByRole("heading", { name: "Page Not Found" })).toBeDefined();
    expect(
      screen.getByText("The page you are looking for does not exist or has been moved."),
    ).toBeDefined();
    expect(screen.getByRole("link", { name: "Return Home" }).getAttribute("href")).toBe("/");
  });
});
