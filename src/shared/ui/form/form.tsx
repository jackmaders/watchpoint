import { useCallback, type ComponentProps, type SubmitEvent } from "react";

import { useFormContext } from "./form-context";

function Form({ ...props }: Omit<ComponentProps<"form">, "onSubmit">) {
  const form = useFormContext();

  const handleSubmit = useCallback(
    (event: SubmitEvent<HTMLFormElement>) => {
      event.preventDefault();
      event.stopPropagation();
      void (async () => {
        try {
          form.setErrorMap({ onSubmit: undefined });
          await form.handleSubmit();
        } catch (error) {
          if (error instanceof Error) {
            form.setErrorMap({ onSubmit: error.message });
          }
        }
      })();
    },
    [form],
  );

  return <form onSubmit={handleSubmit} {...props} />;
}

export { Form };
