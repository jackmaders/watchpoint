import { createFileRoute } from "@tanstack/react-router";
import { useCallback } from "react";
import { z } from "zod";
import {
	getProtectedSessionManifest,
	type MediaRecoveryPrototypeVariant,
	SessionPlayerMediaRecoveryPrototype,
	SessionPlayerPage,
} from "@/pages/vod-detail";

const sessionSearchSchema = z.object({
	modules: z.string().optional(),
	prototype: z.enum(["media-recovery"]).optional(),
	variant: z.enum(["A", "B", "C"]).optional(),
});
type SessionSearch = z.infer<typeof sessionSearchSchema>;

function validateSessionSearch(search: unknown): SessionSearch {
	return sessionSearchSchema.parse(search);
}

export const Route = createFileRoute("/vods/$id/session")({
	component: SessionPlayerRoute,
	loader: async ({
		deps,
		params,
	}: {
		deps: SessionSearch;
		params: { id: string };
	}) => {
		const vod = await getProtectedSessionManifest({
			data: {
				modules: deps.modules,
				vodId: params.id,
			},
		});
		return { vod };
	},
	loaderDeps: ({ search }) => ({
		modules: (search as SessionSearch).modules,
	}),
	validateSearch: validateSessionSearch,
});

function SessionPlayerRoute() {
	const { id } = Route.useParams();
	const { vod } = Route.useLoaderData();
	const { modules, prototype, variant } = Route.useSearch() as SessionSearch;
	const navigate = Route.useNavigate();
	const setPrototypeVariant = useCallback(
		(nextVariant: MediaRecoveryPrototypeVariant) =>
			navigate({
				search: (previous) => ({
					...previous,
					prototype: "media-recovery",
					variant: nextVariant,
				}),
			}),
		[navigate],
	);
	const exitPrototype = useCallback(
		() =>
			navigate({
				search: (previous) => ({
					...previous,
					prototype: undefined,
					variant: undefined,
				}),
			}),
		[navigate],
	);
	if (import.meta.env.DEV && prototype === "media-recovery") {
		return (
			<main className="min-h-screen bg-background px-4 py-6 text-foreground sm:px-6 sm:py-8">
				<SessionPlayerMediaRecoveryPrototype
					onExit={exitPrototype}
					onVariantChange={setPrototypeVariant}
					variant={variant ?? "A"}
				/>
			</main>
		);
	}

	return (
		<SessionPlayerPage params={{ id }} searchParams={{ modules }} vod={vod} />
	);
}
