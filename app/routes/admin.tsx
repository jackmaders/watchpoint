import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { AccessDeniedPage, AdminLayout, checkAdminAccess } from "@/pages/admin";

export const Route = createFileRoute("/admin")({
	beforeLoad: async () => {
		try {
			const user = await checkAdminAccess();
			return { unauthorized: false, user };
		} catch (err: unknown) {
			if (err instanceof Response && err.status === 403) {
				return { unauthorized: true, user: null };
			}
			throw redirect({ to: "/" });
		}
	},
	component: AdminRouteComponent,
});

export function AdminRouteComponent() {
	const context = Route.useRouteContext();
	if (context?.unauthorized) {
		return <AccessDeniedPage />;
	}
	return (
		<AdminLayout user={context?.user}>
			<Outlet />
		</AdminLayout>
	);
}
