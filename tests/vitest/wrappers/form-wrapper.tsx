import { render, type RenderOptions } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ComponentProps, ReactElement, ReactNode } from "react";

import { useAppForm, type AppFormApi, type AppFormOptions } from "@/shared/ui/form/app-form";

interface FormWrapperOptions<TFormData extends Record<string, unknown>> {
  defaultValues?: TFormData;
  fieldName?: keyof TFormData & string;
  fieldValidators?: {
    onBlur?: (params: { value: unknown }) => unknown;
    onChange?: (params: { value: unknown }) => unknown;
    onMount?: (params: { value: unknown }) => unknown;
    onSubmit?: (params: { value: unknown }) => unknown;
  };
  formProps?: Omit<ComponentProps<AppFormApi<TFormData>["Form"]>, "children">;
  onFormReady?: (form: AppFormApi<TFormData>) => void;
  onSubmit?: AppFormOptions<TFormData>["onSubmit"];
  validators?: AppFormOptions<TFormData>["validators"];
}

function noopSubmit() {
  // Intentional empty submit handler for test wrapper
}

function createFormWrapper<TFormData extends Record<string, unknown> = { email: string }>({
  defaultValues = { email: "" } as unknown as TFormData,
  fieldName,
  fieldValidators,
  formProps,
  onFormReady,
  onSubmit = noopSubmit,
  validators,
}: FormWrapperOptions<TFormData> = {}) {
  let latestForm: AppFormApi<TFormData> | null = null;

  function FormWrapper({ children }: { children?: ReactNode }) {
    const form = useAppForm({
      defaultValues,
      onSubmit,
      ...(validators !== undefined && { validators }),
    });
    latestForm = form;
    onFormReady?.(form);

    return (
      <form.AppForm>
        <form.Form {...formProps}>
          {fieldName === undefined ? (
            children
          ) : (
            <form.AppField
              name={fieldName}
              {...(fieldValidators !== undefined && { validators: fieldValidators })}
            >
              {(): ReactNode => children}
            </form.AppField>
          )}
        </form.Form>
      </form.AppForm>
    );
  }

  return {
    getForm: () => latestForm,
    wrapper: FormWrapper,
  };
}

function renderWithForm<TFormData extends Record<string, unknown> = { email: string }>(
  ui: ReactElement,
  options?: FormWrapperOptions<TFormData> & Omit<RenderOptions, "wrapper">,
) {
  const {
    defaultValues,
    fieldName,
    fieldValidators,
    formProps,
    onFormReady,
    onSubmit,
    validators,
    ...renderOptions
  } = options ?? {};
  const formWrapper = createFormWrapper<TFormData>({
    ...(defaultValues !== undefined && { defaultValues }),
    ...(fieldName !== undefined && { fieldName }),
    ...(fieldValidators !== undefined && { fieldValidators }),
    ...(formProps !== undefined && { formProps }),
    ...(onFormReady !== undefined && { onFormReady }),
    ...(onSubmit !== undefined && { onSubmit }),
    ...(validators !== undefined && { validators }),
  });

  return {
    ...render(ui, { wrapper: formWrapper.wrapper, ...renderOptions }),
    ...formWrapper,
    user: userEvent.setup(),
  };
}

export { createFormWrapper, renderWithForm };
export type { FormWrapperOptions };
