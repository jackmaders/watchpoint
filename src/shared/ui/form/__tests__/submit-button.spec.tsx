import { screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vite-plus/test";

import { createDeferred } from "@test/vitest/helpers/deferred";
import { renderWithForm } from "@test/vitest/wrappers/form-wrapper";

import { SubmitButton } from "../submit-button";

describe("submit button component", () => {
  it("renders enabled submit button and forwards props even when form cannot submit", () => {
    expect.assertions(3);

    // Arrange & Act
    renderWithForm(
      <SubmitButton aria-label="Save changes" className="p-2">
        Save
      </SubmitButton>,
      {
        validators: {
          onMount: () => "Form error",
        },
      },
    );
    const button = screen.getByRole("button", { name: "Save changes" });

    // Assert
    expect(button.getAttribute("type")).toBe("submit");
    expect(button.className).toContain("p-2");
    expect(button.hasAttribute("disabled")).toBe(false);
  });

  it("handles explicit type and disabled states", () => {
    expect.assertions(3);

    // Arrange
    const { rerender } = renderWithForm(<SubmitButton disabled>Save</SubmitButton>);
    const saveDisabled = screen.getByText("Save").hasAttribute("disabled");

    // Act
    rerender(
      <SubmitButton type="button" variant="secondary">
        Cancel
      </SubmitButton>,
    );
    const cancelButton = screen.getByText("Cancel");

    // Assert
    expect(saveDisabled).toBe(true);
    expect(cancelButton.getAttribute("type")).toBe("button");
    expect(cancelButton.hasAttribute("disabled")).toBe(false);
  });

  it("disables the button and shows a busy label while submitting", async () => {
    expect.assertions(2);

    // Arrange
    const deferred = createDeferred();
    const { user } = renderWithForm(<SubmitButton aria-label="Save">Save</SubmitButton>, {
      onSubmit: async () => {
        await deferred.promise;
      },
    });
    const button = screen.getByLabelText("Save");

    // Act
    await user.click(button);

    // Assert
    await waitFor(() => {
      expect(button.hasAttribute("disabled")).toBe(true);
      expect(button.getAttribute("aria-busy")).toBe("true");
    });

    deferred.resolve(null);
  });
});
