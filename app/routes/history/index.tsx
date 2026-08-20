import { createFileRoute } from "@tanstack/react-router";
import { useCallback } from "react";
import {
	getPlayerHistory,
	HistoryPage,
	type HistorySearchParams,
	validateHistorySearch,
} from "@/pages/history";
import { getPublishedVods } from "@/pages/vods";

export const Route = createFileRoute("/history/")({
	component: HistoryRoute,
	loader: async ({ deps }: { deps: HistorySearchParams }) => {
		const vods = await getPublishedVods();
		try {
			const data = await getPlayerHistory({
				data: {
					modules: deps.modules,
					page: deps.page,
					pageSize: deps.pageSize,
					status: deps.status,
					vodId: deps.vodId,
				},
			});
			return {
				data,
				error: null,
				registrationEnabled:
					process.env.BETTER_AUTH_ALLOW_REGISTRATION === "true",
				vods,
			};
		} catch (error) {
			return {
				data: {
					items: [],
					page: 1,
					pageSize: 10,
					total: 0,
					totalPages: 1,
				},
				error:
					error instanceof Error
						? error.message
						: "Failed to load player history",
				registrationEnabled:
					process.env.BETTER_AUTH_ALLOW_REGISTRATION === "true",
				vods,
			};
		}
	},
	loaderDeps: ({ search }) => search,
	validateSearch: validateHistorySearch,
});

function HistoryRoute() {
	const search = Route.useSearch() as HistorySearchParams;
	const { data, error, registrationEnabled, vods } = Route.useLoaderData();
	const navigate = Route.useNavigate();

	const handleFilterChange = useCallback(
		(newParams: HistorySearchParams) => {
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

	return (
		<HistoryPage
			data={data}
			error={error}
			onFilterChange={handleFilterChange}
			registrationEnabled={registrationEnabled}
			searchParams={search}
			vods={vods}
		/>
	);
}
