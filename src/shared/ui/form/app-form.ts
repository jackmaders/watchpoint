import {
  createFormHook,
  type FormAsyncValidateOrFn,
  type FormOptions,
  type FormValidateOrFn,
} from "@tanstack/react-form";
import type { ComponentProps } from "react";

import { Form } from "./form";
import { fieldContext, formContext } from "./form-context";
import { FormError } from "./form-error";
import { SubmitButton } from "./submit-button";
import { TextField } from "./text-field";

const { useAppForm } = createFormHook({
  fieldComponents: {
    TextField,
  },
  fieldContext,
  formComponents: { Form, FormError, SubmitButton },
  formContext,
});

type AppFormProps = ComponentProps<ReturnType<typeof useAppForm>["Form"]>;

type AppFormOptions<TFormData> = FormOptions<
  TFormData,
  FormValidateOrFn<TFormData>,
  FormValidateOrFn<TFormData>,
  FormAsyncValidateOrFn<TFormData>,
  FormValidateOrFn<TFormData>,
  FormAsyncValidateOrFn<TFormData>,
  FormValidateOrFn<TFormData>,
  FormAsyncValidateOrFn<TFormData>,
  FormValidateOrFn<TFormData>,
  FormAsyncValidateOrFn<TFormData>,
  FormAsyncValidateOrFn<TFormData>,
  undefined
>;

type AppFormApi<TFormData> = ReturnType<
  typeof useAppForm<
    TFormData,
    FormValidateOrFn<TFormData>,
    FormValidateOrFn<TFormData>,
    FormAsyncValidateOrFn<TFormData>,
    FormValidateOrFn<TFormData>,
    FormAsyncValidateOrFn<TFormData>,
    FormValidateOrFn<TFormData>,
    FormAsyncValidateOrFn<TFormData>,
    FormValidateOrFn<TFormData>,
    FormAsyncValidateOrFn<TFormData>,
    FormAsyncValidateOrFn<TFormData>,
    undefined
  >
>;

export { useAppForm };
export type { AppFormProps, AppFormOptions, AppFormApi };
