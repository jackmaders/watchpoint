import { createEvent, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ComponentProps } from "react";
import { describe, expect, it, vi } from "vite-plus/test";

import {
  TEST_ACCOUNT_SCHEMA,
  TEST_FORM_ERRORS,
  TEST_FORM_VALUES,
} from "@test/vitest/fixtures/form";

import { useAppForm } from "../app-form";
import { Form } from "../form";

interface TestFormProps extends ComponentProps<typeof Form> {
  initialName?: string;
  onSave?: () => Promise<void>;
}

async function noopSave() {
  await Promise.resolve();
}

function TestForm({
  children = "Account details",
  initialName = TEST_FORM_VALUES.accountName,
  onSave = noopSave,
  ...props
}: TestFormProps) {
  const form = useAppForm({
    defaultValues: { accountName: initialName },
    onSubmit: async () => {
      await onSave();
    },
    validators: { onSubmit: TEST_ACCOUNT_SCHEMA },
  });

  return (
    <form.AppForm>
      <Form aria-label="Account form" {...props}>
        {children}
        <form.AppField name="accountName">
          {(field) => <field.TextField label="Account name" placeholder="Account name" />}
        </form.AppField>
        <form.FormError />
        <form.SubmitButton>Save</form.SubmitButton>
      </Form>
    </form.AppForm>
  );
}

describe("form component", () => {
  it("renders form, forwards props and children, and submits valid values", async () => {
    expect.hasAssertions();

    // Arrange
    const onSave = vi.fn<() => Promise<void>>().mockResolvedValue();
    const parentOnSubmit = vi.fn<() => void>();

    render(
      <div onSubmit={parentOnSubmit}>
        <TestForm className="p-2" data-testid="form" id="account-form" onSave={onSave} />
      </div>,
    );

    const form = screen.getByLabelText("Account form");
    const submitEvent = createEvent.submit(form);

    // Act
    fireEvent(form, submitEvent);

    // Assert
    expect(form.getAttribute("id")).toBe("account-form");
    expect(form.className).toContain("p-2");
    expect(submitEvent.defaultPrevented).toBe(true);
    expect(parentOnSubmit).not.toHaveBeenCalled();
    await waitFor(() => {
      expect(onSave).toHaveBeenCalledOnce();
    });
  });

  it("handles validation errors and save rejections with Error instance", async () => {
    expect.hasAssertions();

    // Arrange
    const onSave = vi
      .fn<() => Promise<void>>()
      .mockRejectedValue(new Error(TEST_FORM_ERRORS.requestUnavailable));

    render(<TestForm initialName={TEST_FORM_VALUES.validAccountName} onSave={onSave} />);

    // Act
    fireEvent.submit(screen.getByLabelText("Account form"));

    // Assert
    await waitFor(() => {
      expect(onSave).toHaveBeenCalledOnce();
    });
  });

  it("handles non-Error save rejections gracefully", async () => {
    expect.hasAssertions();

    // Arrange
    const onSave = vi.fn<() => Promise<void>>().mockRejectedValue(TEST_FORM_ERRORS.stringRejection);

    render(<TestForm initialName={TEST_FORM_VALUES.validAccountName} onSave={onSave} />);

    // Act
    fireEvent.submit(screen.getByLabelText("Account form"));

    // Assert
    await waitFor(() => {
      expect(onSave).toHaveBeenCalledOnce();
    });
  });
});
