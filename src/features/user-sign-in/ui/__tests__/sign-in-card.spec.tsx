import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vite-plus/test";

import { SignInCard } from "../sign-in-card";

vi.mock(import("../sign-in-form"));

describe("sign in card", () => {
  it("renders Watchpoint description copy and sign in form", () => {
    expect.assertions(3);

    render(<SignInCard />);

    expect(
      screen.getByText("Enter your credentials to access Watchpoint VOD reviews"),
    ).toBeDefined();
    expect(screen.getByRole("heading", { name: "Sign In" })).toBeDefined();
    expect(screen.getByText("Sign In Form")).toBeDefined();
  });
});
