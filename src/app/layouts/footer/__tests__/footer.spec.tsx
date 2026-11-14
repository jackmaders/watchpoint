import { screen, within } from "@testing-library/react";
import { describe, expect, it } from "vite-plus/test";

import { Footer } from "@/app/layouts/footer";
import { renderWithProviders } from "@test/vitest/wrappers/testing-wrapper";

describe("footer navigation", () => {
  it("provides navigation links to home and about", () => {
    expect.assertions(2);

    // Act
    renderWithProviders(<Footer />, { routePaths: ["/", "/about"] });
    const footer = within(screen.getByRole("contentinfo"));

    // Assert
    expect(footer.getByRole("link", { name: "Home" }).getAttribute("href")).toBe("/");
    expect(footer.getByRole("link", { name: "About" }).getAttribute("href")).toBe("/about");
  });
});
