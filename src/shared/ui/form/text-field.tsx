import { useCallback, useId, type ChangeEvent, type ComponentProps } from "react";

import { Field, FieldDescription, FieldLabel } from "@/shared/ui/shadcn/field";
import { Input } from "@/shared/ui/shadcn/input";

import { useFieldContext, useFormContext } from "./form-context";
import { FormFieldError } from "./form-field-error";

type TextFieldProps = Omit<
  ComponentProps<typeof Input>,
  "aria-describedby" | "aria-invalid" | "id" | "name" | "onBlur" | "onChange" | "value"
> & {
  description?: string;
  label: string;
  optional?: boolean | undefined;
};

function selectIsSubmitting(state: { isSubmitting: boolean }) {
  return state.isSubmitting;
}

function isFieldInvalid(field: ReturnType<typeof useFieldContext<string>>): boolean {
  if (field.state.meta.isValid) {
    return false;
  }
  return field.state.meta.isBlurred || field.form.state.submissionAttempts > 0;
}

interface DescribedByParams {
  descriptionId: string;
  errorId: string;
  hasDescription: boolean;
  isInvalid: boolean;
}

function getDescribedBy({
  descriptionId,
  errorId,
  hasDescription,
  isInvalid,
}: DescribedByParams): string | undefined {
  if (isInvalid && hasDescription) {
    return `${errorId} ${descriptionId}`;
  }
  if (isInvalid) {
    return errorId;
  }
  if (hasDescription) {
    return descriptionId;
  }
  return undefined;
}

interface TextFieldInputProps extends Omit<ComponentProps<typeof Input>, "onChange"> {
  describedBy: string | undefined;
  disabled: boolean;
  field: ReturnType<typeof useFieldContext<string>>;
  id: string;
  isInvalid: boolean;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
}

function TextFieldInput({
  describedBy,
  disabled,
  field,
  id,
  isInvalid,
  onChange,
  ...props
}: TextFieldInputProps) {
  const form = useFormContext();

  return (
    <form.Subscribe selector={selectIsSubmitting}>
      {(isSubmitting) => (
        <Input
          {...props}
          {...(describedBy === undefined ? {} : { "aria-describedby": describedBy })}
          aria-invalid={isInvalid}
          disabled={disabled || isSubmitting}
          id={id}
          name={field.name}
          onBlur={field.handleBlur}
          onChange={onChange}
          value={field.state.value}
        />
      )}
    </form.Subscribe>
  );
}

function TextField({
  description,
  disabled = false,
  label,
  optional,
  required,
  ...props
}: TextFieldProps) {
  const field = useFieldContext<string>();
  const id = useId();
  const errorId = `${id}-error`;
  const descriptionId = `${id}-description`;
  const isInvalid = isFieldInvalid(field);
  const hasDescription = typeof description === "string" && description.length > 0;
  const describedBy = getDescribedBy({ descriptionId, errorId, hasDescription, isInvalid });

  const handleChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      field.handleChange(event.currentTarget.value);
    },
    [field],
  );

  return (
    <Field data-invalid={isInvalid}>
      <FieldLabel htmlFor={id}>
        {label}
        {(optional ?? required !== true) ? (
          <span aria-hidden="true" className="font-normal text-muted-foreground">
            (optional)
          </span>
        ) : null}
      </FieldLabel>
      {hasDescription ? (
        <FieldDescription id={descriptionId}>{description}</FieldDescription>
      ) : null}
      <TextFieldInput
        {...props}
        describedBy={describedBy}
        disabled={disabled}
        field={field}
        id={id}
        isInvalid={isInvalid}
        onChange={handleChange}
        required={required}
      />
      <FormFieldError hidden={!isInvalid} id={errorId} />
    </Field>
  );
}

export { TextField };
