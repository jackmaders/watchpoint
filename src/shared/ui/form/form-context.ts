import { createFormHookContexts } from "@tanstack/react-form";

const { fieldContext, formContext, useFieldContext, useFormContext } = createFormHookContexts();

type AppFieldApi<TData = unknown> = ReturnType<typeof useFieldContext<TData>>;

export { fieldContext, formContext, useFieldContext, useFormContext };
export type { AppFieldApi };
