import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";

import { signOut } from "@/shared/auth";

import { SignOutDialog } from "../sign-out-dialog";

vi.mock(import("@/shared/auth"));

afterEach(() => {
  vi.restoreAllMocks();
});

async function openDialog() {
  const user = userEvent.setup();
  render(<SignOutDialog />);
  await user.click(screen.getByRole("button", { name: "Sign Out" }));
  const dialog = await screen.findByRole("dialog", { name: "Sign out?" });
  return { dialog, user };
}

describe("sign out confirmation", () => {
  it("does not sign out when confirmation is cancelled", async () => {
    expect.assertions(2);

    // Arrange
    const { dialog, user } = await openDialog();

    // Act
    await user.click(within(dialog).getByRole("button", { name: "Cancel" }));

    // Assert
    expect(signOut).not.toHaveBeenCalled();
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("signs out on confirmation", async () => {
    expect.assertions(1);

    // Arrange
    const { dialog, user } = await openDialog();

    // Act
    await user.click(within(dialog).getByRole("button", { name: "Sign Out" }));

    // Assert
    expect(signOut).toHaveBeenCalledOnce();
  });
});
