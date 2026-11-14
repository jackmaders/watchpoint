import { render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ComponentProps } from "react";
import { describe, expect, it, vi } from "vite-plus/test";

import { NavigationGuardDialog } from "../navigation-guard-dialog";

describe("navigation guard dialog", () => {
  it("forwards onOpenChange and only calls onCancel when nextOpen is false", async () => {
    expect.assertions(2);

    // Arrange
    const user = userEvent.setup();
    const onCancel = vi.fn<() => void>();
    const onConfirm = vi.fn<() => void>();
    const onOpenChange =
      vi.fn<NonNullable<ComponentProps<typeof NavigationGuardDialog>["onOpenChange"]>>();

    render(
      <NavigationGuardDialog
        message="Test message"
        onCancel={onCancel}
        onConfirm={onConfirm}
        onOpenChange={onOpenChange}
        open
        title="Test title"
      />,
    );

    // Act
    await user.keyboard("{Escape}");

    // Assert
    expect(onCancel).toHaveBeenCalledOnce();
    expect(onOpenChange).toHaveBeenCalledWith(
      false,
      expect.objectContaining({ reason: "escape-key" }),
    );
  });
});
