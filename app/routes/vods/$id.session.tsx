import { createFileRoute } from "@tanstack/react-router";
import { useCallback } from "react";
import { z } from "zod";
import {
	getProtectedSessionManifest,
	type MediaRecoveryPrototypeVariant,
	normalizeSessionManifestModules,
	SessionPlayerMediaRecoveryPrototype,
	SessionPlayerPage,
	startPlaythroughAction,
} from "@/pages/vod-detail";

const sessionSearchSchema = z.object({
	modules: z.string().optional(),
	playthroughId: z.string().uuid().optional(),
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
		if (!vod) return { playthroughId: null, scenarioSnapshotIds: [], vod };
		const modules = normalizeSessionManifestModules(deps.modules) ?? [];
		const playthroughId = deps.playthroughId ?? crypto.randomUUID();
		const scenarioSnapshotIds = vod.scenarios.map(
			(_, index) => `snapshot-${playthroughId}-${index}`,
		);
		const started = await startPlaythroughAction({
			id: playthroughId,
			modules,
			scenarios: vod.scenarios.map((scenario, index) => ({
				explanationText: scenario.explanationText,
				id: scenarioSnapshotIds[index],
				imageUrl: scenario.imageUrl,
				inputConfig: scenario.inputConfig,
				inputType: scenario.inputType,
				moduleType: scenario.moduleType,
				promptText: scenario.promptText,
				scenarioId: scenario.id,
				timeLimitSeconds: scenario.timeLimitSeconds,
				timestampSeconds: scenario.timestampSeconds,
			})),
			vodId: params.id,
		});
		if (!started.success) throw new Error(started.error);
		return {
			playthroughId: started.playthrough.id,
			scenarioSnapshotIds: started.scenarioSnapshotIds,
			vod,
		};
	},
	loaderDeps: ({ search }) => ({
		modules: (search as SessionSearch).modules,
		playthroughId: (search as SessionSearch).playthroughId,
	}),
	validateSearch: validateSessionSearch,
});

function SessionPlayerRoute() {
	const { id } = Route.useParams();
	const { playthroughId, scenarioSnapshotIds, vod } = Route.useLoaderData();
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
		<SessionPlayerPage
			params={{ id }}
			playthroughId={playthroughId}
			scenarioSnapshotIds={scenarioSnapshotIds}
			searchParams={{
				modules: modules ?? undefined,
				playthroughId: playthroughId ?? undefined,
			}}
			vod={vod}
		/>
	);
}
