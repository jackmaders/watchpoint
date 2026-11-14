import { createContext, type ReactElement } from "react";
import { vi } from "vite-plus/test";

interface MockSubscribeProps<TValue = unknown> {
  children: (selected: TValue) => ReactElement | null;
  selector: (state: unknown) => TValue;
}

const mockForm = {
  Subscribe: vi.fn<({ children, selector }: MockSubscribeProps) => ReactElement | null>(
    ({ children, selector }: MockSubscribeProps) =>
      children(
        selector({ canSubmit: true, errorMap: {}, isSubmitting: false, submissionAttempts: 0 }),
      ),
  ),
  handleSubmit: vi.fn<() => Promise<void>>(async () => {
    await Promise.resolve();
  }),
  reset: vi.fn<() => void>(),
  setErrorMap: vi.fn<(map: unknown) => void>(),
  state: {
    canSubmit: true,
    errorMap: {},
    isSubmitting: false,
    submissionAttempts: 0,
  },
};

const mockField = {
  form: mockForm,
  handleBlur: vi.fn<() => void>(),
  handleChange: vi.fn<(value: unknown) => void>(),
  name: "email",
  state: {
    meta: { errors: [], isBlurred: false, isTouched: false, isValid: true },
    value: "",
  },
};

const contexts = {
  fieldContext: createContext(null),
  formContext: createContext(null),
  useFieldContext: vi.fn<() => typeof mockField>(() => mockField),
  useFormContext: vi.fn<() => typeof mockForm>(() => mockForm),
};

const createFormHookContexts = vi.fn<() => typeof contexts>(() => contexts);

export { createFormHookContexts };
