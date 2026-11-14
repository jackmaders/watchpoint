import { screen } from "@testing-library/react";
import { describe, expect, it } from "vite-plus/test";

import { TEST_FORM_ERRORS } from "@test/vitest/fixtures/form";
import { renderWithForm } from "@test/vitest/wrappers/form-wrapper";

import { FormFieldError } from "../form-field-error";

describe("form field error component", () => {
  it("renders nothing when the field has no errors", () => {
    expect.assertions(1);

    // Act
    renderWithForm(<FormFieldError />, { fieldName: "email" });

    // Assert
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("normalizes string errors into field error messages", () => {
    expect.assertions(2);

    // Arrange & Act
    renderWithForm(<FormFieldError id="field-error" />, {
      fieldName: "email",
      fieldValidators: { onMount: () => TEST_FORM_ERRORS.stringError },
    });
    const alert = screen.getByRole("alert");

    // Assert
    expect(alert.getAttribute("id")).toBe("field-error");
    expect(alert.textContent).toContain(TEST_FORM_ERRORS.stringError);
  });

  it("normalizes object errors with message properties", () => {
    expect.assertions(1);

    // Arrange & Act
    renderWithForm(<FormFieldError />, {
      fieldName: "email",
      fieldValidators: { onMount: () => TEST_FORM_ERRORS.objectError },
    });

    // Assert
    expect(screen.getByRole("alert").textContent).toContain(TEST_FORM_ERRORS.objectError.message);
  });

  it("ignores errors without a string message", () => {
    expect.assertions(1);

    // Arrange & Act
    renderWithForm(<FormFieldError />, {
      fieldName: "email",
      fieldValidators: {
        onMount: () => ({ invalid: true }),
      },
    });

    // Assert
    expect(screen.queryByRole("alert")).toBeNull();
  });
});
