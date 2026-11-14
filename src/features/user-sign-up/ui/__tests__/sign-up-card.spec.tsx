import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vite-plus/test";

import { SignUpCard } from "../sign-up-card";

vi.mock(import("../sign-up-form"));

describe("sign up card", () => {
  it("renders information prompt description copy and sign up form", () => {
    expect.assertions(3);

    render(<SignUpCard />);

    expect(screen.getByText("Create an account to start managing your todos")).toBeDefined();
    expect(screen.getByRole("heading", { name: "Sign Up" })).toBeDefined();
    expect(screen.getByText("Sign Up Form")).toBeDefined();
  });
});
