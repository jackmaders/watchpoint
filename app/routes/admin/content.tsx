import { createFileRoute } from "@tanstack/react-router";
import { useCallback } from "react";
import {
	AdminContentPage,
	type ContentSearchParams,
	getAdminVods,
	toGetAdminVodsQuery,
	validateContentSearch,
} from "@/pages/admin-content";

export const Route = createFileRoute("/admin/content")({
	component: AdminContentRouteComponent,
	loader: async ({ deps }: { deps: ContentSearchParams }) => {
		const vods = await getAdminVods({
			data: toGetAdminVodsQuery(deps),
		});
		return { vods };
	},
	loaderDeps: ({ search }) => search,
	validateSearch: validateContentSearch,
});

export function AdminContentRouteComponent() {
	const { user } = Route.useRouteContext();
	const { vods } = Route.useLoaderData();
	const search = Route.useSearch() as ContentSearchParams;
	const navigate = Route.useNavigate();

	const handleFilterChange = useCallback(
		(newParams: ContentSearchParams) => {
			navigate({
				search: (prev) => ({
					...prev,
					...newParams,
				}),
				to: ".",
			});
		},
		[navigate],
	);

	if (!user) {
		return null;
	}

	return (
		<AdminContentPage
			currentUser={user}
			initialVods={vods}
			onFilterChange={handleFilterChange}
			searchParams={search}
		/>
	);
}
