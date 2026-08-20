import { Link } from "@tanstack/react-router";

export function AccessDeniedPage() {
	return (
		<main className="flex min-h-screen items-center justify-center bg-background p-6 text-foreground">
			<div className="w-full max-w-md space-y-6 rounded-xl border border-destructive/30 bg-card p-8 text-center shadow-xl">
				<div className="inline-flex rounded-sm border border-destructive/40 bg-destructive/10 px-3 py-1 font-mono text-xs font-semibold uppercase tracking-widest text-destructive">
					Security / 403 Forbidden
				</div>
				<div className="space-y-2">
					<h1 className="text-2xl font-bold tracking-tight text-foreground">
						403 - Access Denied
					</h1>
					<p className="text-sm text-muted-foreground">
						Administrator authorization is required to access this area. Your
						current account does not have administrative privileges.
					</p>
				</div>
				<div className="pt-2">
					<Link
						className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
						to="/"
					>
						Return Home
					</Link>
				</div>
			</div>
		</main>
	);
}
