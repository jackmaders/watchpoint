import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vite-plus/test";

import { createTestingWrapper } from "@test/vitest/wrappers/testing-wrapper";

import { ErrorPage } from "../error-page";

describe("error page", () => {
  it("renders error heading, description, and retry action", async () => {
    expect.assertions(4);
    const user = userEvent.setup();
    const reset = vi.fn<() => void>();
    const { router, wrapper } = createTestingWrapper();
    vi.spyOn(router, "invalidate").mockResolvedValue();

    render(<ErrorPage reset={reset} />, { wrapper });
    await user.click(screen.getByRole("button", { name: "Try again" }));

    expect(screen.getByText("This page couldn’t load")).toBeDefined();
    expect(screen.getByText("Something went wrong. Please try again.")).toBeDefined();
    expect(reset).toHaveBeenCalledOnce();
    expect(router.invalidate).toHaveBeenCalledOnce();
  });
});
