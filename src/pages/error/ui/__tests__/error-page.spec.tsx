import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vite-plus/test";

import { ErrorPage } from "../error-page";

describe("error page", () => {
  it("renders error heading and description", () => {
    expect.assertions(2);

    render(<ErrorPage />);

    expect(screen.getByText("This page couldn’t load")).toBeDefined();
    expect(screen.getByText("Something went wrong. Please try again.")).toBeDefined();
  });
});
