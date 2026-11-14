import { Link } from "@tanstack/react-router";

export function NotFoundPage() {
  return (
    <div className="mx-auto w-full max-w-5xl py-16 text-center">
      <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
        Page Not Found
      </h1>
      <p className="mt-4 text-base text-muted-foreground">
        The page you are looking for does not exist or has been moved.
      </p>
      <div className="mt-8">
        <Link
          className="inline-flex items-center justify-center rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-xs transition hover:opacity-90"
          to="/"
        >
          Return Home
        </Link>
      </div>
    </div>
  );
}
