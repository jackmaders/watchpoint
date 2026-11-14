import { screen } from "@testing-library/react";
import { describe, expect, it } from "vite-plus/test";

import { TEST_FORM_ERRORS } from "@test/vitest/fixtures/form";
import { renderWithForm } from "@test/vitest/wrappers/form-wrapper";

import { FormError } from "../form-error";

describe("form error component", () => {
  it("renders nothing when there is no submission error", () => {
    expect.assertions(1);

    // Act
    renderWithForm(<FormError />);

    // Assert
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("renders the submission error as an alert and forwards props", async () => {
    expect.assertions(3);

    // Arrange
    const { user } = renderWithForm(
      <>
        <FormError className="p-2" id="submit-error" />
        <button type="submit">Submit</button>
      </>,
      {
        onSubmit: () => {
          throw new Error(TEST_FORM_ERRORS.invalidCredentials);
        },
      },
    );

    // Act
    await user.click(screen.getByRole("button", { name: "Submit" }));
    const alert = await screen.findByRole("alert");

    // Assert
    expect(alert.textContent).toContain(TEST_FORM_ERRORS.invalidCredentials);
    expect(alert.getAttribute("id")).toBe("submit-error");
    expect(alert.className).toContain("p-2");
  });
});
