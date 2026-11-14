import type { ComponentProps } from "react";

import { FieldError } from "@/shared/ui/shadcn/field";

import { useFieldContext } from "./form-context";

type FormFieldErrorProps = Omit<ComponentProps<typeof FieldError>, "errors">;

function FormFieldError(props: FormFieldErrorProps) {
  const field = useFieldContext<unknown>();
  const fieldErrors: readonly unknown[] = field.state.meta.errors;
  const errors = fieldErrors.map((error) => {
    if (typeof error === "string") {
      return { message: error };
    }

    if (
      typeof error === "object" &&
      error !== null &&
      "message" in error &&
      typeof error.message === "string"
    ) {
      return { message: error.message };
    }

    return {};
  });

  return <FieldError {...props} errors={errors} />;
}

export { FormFieldError };
