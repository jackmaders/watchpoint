import { screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vite-plus/test";

import { TEST_EMAIL_SCHEMA, TEST_FORM_ERRORS, TEST_FORM_VALUES } from "@test/vitest/fixtures/form";
import { createDeferred } from "@test/vitest/helpers/deferred";
import { renderWithForm } from "@test/vitest/wrappers/form-wrapper";

import { TextField } from "../text-field";

describe("text field component", () => {
  it("renders controlled text field, forwards props, changes, and blur", async () => {
    expect.assertions(4);

    // Arrange
    const { getForm, rerender, user } = renderWithForm(
      <TextField className="p-2" label="Email address" placeholder="you@example.com" />,
      {
        defaultValues: { email: TEST_FORM_VALUES.email },
        fieldName: "email",
      },
    );
    const input = screen.getByLabelText<HTMLInputElement>(/^Email address/u);
    const initialValue = input.value;
    const initialPlaceholder = input.getAttribute("placeholder");
    const initialClassName = input.className;

    // Act
    rerender(<TextField label="Email address" />);
    await user.clear(input);
    await user.type(input, TEST_FORM_VALUES.updatedEmail);
    await user.tab();

    // Assert
    expect(initialValue).toBe(TEST_FORM_VALUES.email);
    expect(initialPlaceholder).toBe("you@example.com");
    expect(initialClassName).toContain("p-2");
    expect(getForm()?.state.values.email).toBe(TEST_FORM_VALUES.updatedEmail);
  });

  it("handles validation errors when untouched, blurred, and on submission attempt", async () => {
    expect.assertions(5);

    // Arrange
    const { user } = renderWithForm(
      <>
        <TextField label="Email address" />
        <button type="submit">Submit</button>
      </>,
      {
        defaultValues: { email: TEST_FORM_VALUES.emptyEmail },
        fieldName: "email",
        fieldValidators: { onMount: () => TEST_FORM_ERRORS.invalidEmail },
      },
    );
    const input = screen.getByLabelText(/^Email address/u);
    const untouchedInvalid = input.getAttribute("aria-invalid");
    const untouchedHidden = screen
      .queryByText(TEST_FORM_ERRORS.invalidEmail)
      ?.hasAttribute("hidden");

    // Act: blur
    await user.click(input);
    await user.tab();
    const error = screen.getByText(TEST_FORM_ERRORS.invalidEmail);
    const blurredInvalid = input.getAttribute("aria-invalid");
    const blurredDescribedBy = input.getAttribute("aria-describedby");

    // Act: submit
    await user.click(screen.getByRole("button", { name: "Submit" }));
    const submittedInvalid = input.getAttribute("aria-invalid");

    // Assert
    expect(untouchedInvalid).toBe("false");
    expect(untouchedHidden).toBe(true);
    expect(blurredInvalid).toBe("true");
    expect(blurredDescribedBy).toBe(error.getAttribute("id"));
    expect(submittedInvalid).toBe("true");
  });

  it("handles disabled states during submission or when explicitly disabled", async () => {
    expect.assertions(2);

    // Arrange
    const deferred = createDeferred();
    const { rerender, user } = renderWithForm(
      <>
        <TextField label="Email address" />
        <button type="submit">Submit</button>
      </>,
      {
        defaultValues: { email: TEST_FORM_VALUES.email },
        fieldName: "email",
        onSubmit: async () => {
          await deferred.promise;
        },
      },
    );
    const input = screen.getByLabelText(/^Email address/u);

    // Act
    await user.click(screen.getByRole("button", { name: "Submit" }));
    await waitFor(() => {
      expect(input.hasAttribute("disabled")).toBe(true);
    });
    deferred.resolve(null);

    rerender(<TextField disabled label="Email address" />);

    // Assert
    expect(input.hasAttribute("disabled")).toBe(true);
  });

  it("sets aria-describedby for description with valid and invalid fields", async () => {
    expect.assertions(4);

    // Arrange
    const { user } = renderWithForm(<TextField description="Help text" label="Email address" />, {
      defaultValues: { email: TEST_FORM_VALUES.emptyEmail },
      fieldName: "email",
      fieldValidators: {
        onChange: TEST_EMAIL_SCHEMA as never,
      },
    });
    const input = screen.getByLabelText(/^Email address/u);
    const description = screen.getByText("Help text");
    const validDescribedBy = input.getAttribute("aria-describedby");
    const validInvalidAttr = input.getAttribute("aria-invalid");

    // Act
    await user.type(input, "a");
    await user.clear(input);
    await user.tab();
    const invalidDescribedBy = input.getAttribute("aria-describedby");

    // Assert
    expect(validDescribedBy).toBe(description.getAttribute("id"));
    expect(validInvalidAttr).toBe("false");
    expect(invalidDescribedBy).toContain("-error");
    expect(invalidDescribedBy).toContain("-description");
  });

  it("renders an inline optional indicator when not required and omits it when required", () => {
    expect.assertions(2);

    // Arrange & Act
    const { rerender } = renderWithForm(<TextField label="Source" />, { fieldName: "email" });
    const optionalText = screen.queryByText("(optional)");
    rerender(<TextField label="Title" required />);
    const requiredText = screen.queryByText("(optional)");

    // Assert
    expect(optionalText).not.toBeNull();
    expect(requiredText).toBeNull();
  });
});
