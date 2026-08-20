import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import type { AuthenticatedUser } from "@/shared/lib/permissions";
import { AccountControls } from "@/shared/ui/auth-modal";

export function AdminLayout({
	children,
	user,
}: {
	children?: ReactNode;
	user?: AuthenticatedUser | null;
}) {
	return (
		<div className="min-h-screen bg-background text-foreground flex flex-col">
			<header className="sticky top-0 z-30 border-b border-border bg-card/90 backdrop-blur">
				<div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
					<div className="flex items-center gap-6">
						<div className="flex items-center gap-2">
							<span className="font-mono text-sm font-bold uppercase tracking-wider text-primary">
								Watchpoint Admin
							</span>
							<span className="rounded-full bg-primary/10 px-2 py-0.5 font-mono text-[10px] font-semibold text-primary border border-primary/20">
								ADMIN
							</span>
						</div>
						<nav className="flex items-center gap-4 text-sm font-medium">
							<Link
								activeProps={{
									className: "text-foreground font-semibold",
								}}
								className="text-muted-foreground transition-colors hover:text-foreground"
								to="/admin/users"
							>
								Users
							</Link>
						</nav>
					</div>
					<div className="flex items-center gap-4">
						<Link
							className="text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
							to="/"
						>
							&larr; View Site
						</Link>
						{user ? <AccountControls /> : null}
					</div>
				</div>
			</header>
			<main className="flex-1 mx-auto w-full max-w-7xl p-4 sm:p-6 lg:p-8">
				{children}
			</main>
		</div>
	);
}
