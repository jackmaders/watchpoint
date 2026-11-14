import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vite-plus/test";

import { AboutPage } from "../about-page";

describe("about page", () => {
  it("renders the static about heading and description", () => {
    expect.assertions(2);

    // Arrange & Act
    render(<AboutPage />);

    // Assert
    expect(screen.getByRole("heading", { level: 1 })).toBeDefined();
    expect(screen.getByText(/About/u)).toBeDefined();
  });
});
