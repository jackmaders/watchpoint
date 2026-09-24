import { createFileRoute, redirect } from "@tanstack/react-router";
import { requireAdminServerFn } from "@/features/admin-access/api/admin-access.functions";

export const Route = createFileRoute("/admin/")({
	beforeLoad: async () => {
		try {
			await requireAdminServerFn();
		} catch {
			throw redirect({ to: "/" });
		}
	},
	component: AdminWorkspace,
});

function AdminWorkspace() {
	return (
		<main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-4 p-8">
			<p className="font-mono text-muted-foreground text-xs uppercase tracking-brand">
				Admin workspace
			</p>
			<h1 className="font-heading font-medium text-4xl tracking-tight">
				VOD authoring
			</h1>
			<p className="max-w-xl text-muted-foreground">
				Manage VODs and author Questions for Watchpoint Lessons.
			</p>
		</main>
	);
}
