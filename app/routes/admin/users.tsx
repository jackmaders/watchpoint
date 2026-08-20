import { createFileRoute } from "@tanstack/react-router";
import { AdminUsersPage, getAdminUsers } from "@/pages/admin-users";

export const Route = createFileRoute("/admin/users")({
	component: AdminUsersRouteComponent,
	loader: async () => {
		const users = await getAdminUsers({ data: {} });
		return { users };
	},
});

export function AdminUsersRouteComponent() {
	const { user } = Route.useRouteContext();
	const { users } = Route.useLoaderData();
	if (!user) {
		return null;
	}
	return <AdminUsersPage currentUser={user} initialUsers={users} />;
}
