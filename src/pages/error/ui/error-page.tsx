export function ErrorPage() {
  return (
    <div className="mx-auto w-full max-w-5xl py-16 text-center">
      <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
        This page couldn’t load
      </h1>
      <p className="mt-4 text-base text-muted-foreground">
        Something went wrong. Please try again.
      </p>
    </div>
  );
}
