import { Loader } from "lucide-react";
import type { ComponentProps } from "react";

import { Button } from "@/shared/ui/shadcn/button";

import { useFormContext } from "./form-context";

function SubmitButton({
  children,
  disabled,
  type = "submit",
  ...props
}: ComponentProps<typeof Button>) {
  const form = useFormContext();

  return (
    <form.Subscribe selector={(state) => state.isSubmitting}>
      {(isSubmitting) => (
        <Button
          {...props}
          aria-busy={isSubmitting}
          disabled={Boolean(disabled) || isSubmitting}
          type={type}
        >
          {isSubmitting ? (
            <>
              <Loader aria-hidden="true" data-icon="inline-start" />
              <span className="sr-only">Please wait…</span>
            </>
          ) : (
            children
          )}
        </Button>
      )}
    </form.Subscribe>
  );
}

export { SubmitButton };
