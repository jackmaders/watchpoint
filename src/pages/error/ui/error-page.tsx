import { type ErrorComponentProps, useRouter } from "@tanstack/react-router";

import { Button } from "@/shared/ui/shadcn/button";

export function ErrorPage({ reset }: Pick<ErrorComponentProps, "reset">) {
  const router = useRouter();
  return (
    <div className="mx-auto w-full max-w-5xl py-16 text-center">
      <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
        This page couldn’t load
      </h1>
      <p className="mt-4 text-base text-muted-foreground">
        Something went wrong. Please try again.
      </p>
      <Button
        className="mt-6"
        type="button"
        onClick={async () => {
          reset();
          await router.invalidate();
        }}
      >
        Try again
      </Button>
    </div>
  );
}
