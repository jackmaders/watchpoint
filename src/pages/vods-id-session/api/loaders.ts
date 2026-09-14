/**
 * Route loader initializing the session manifest and durable playthrough generation.
 *
 * Implements `sessionPlaythroughQueryOptions` and `loadVodsIdSessionPage` to fetch the protected session manifest
 * via `getProtectedSessionManifest`, create a new playthrough generation via `startPlaythroughAction`, and initialize scenario snapshot IDs.
 */

import type { QueryClient } from "@tanstack/react-query";
import { queryOptions } from "@tanstack/react-query";
import {
	getProtectedSessionManifest,
	normalizeSessionManifestModules,
	startPlaythroughAction,
} from "@/entities/vod";
import { queryKeys } from "@/shared/api";
import type { SessionSearch } from "../model/session-search";

export const sessionPlaythroughQueryOptions = (
	vodId: string,
	modules?: string,
) =>
	queryOptions({
		queryFn: () =>
			getProtectedSessionManifest({
				data: {
					modules,
					vodId,
				},
			}),
		queryKey: [...queryKeys.sessionPlaythrough, vodId, modules ?? ""] as const,
	});

export async function loadVodsIdSessionPage({
	context,
	deps,
	params,
}: {
	context?: { queryClient: QueryClient };
	deps: SessionSearch;
	params: { id: string };
}) {
	if (context?.queryClient) {
		await context.queryClient.query({
			...sessionPlaythroughQueryOptions(params.id, deps.modules),
			staleTime: "static",
		});
	}

	const vod = await getProtectedSessionManifest({
		data: {
			modules: deps.modules,
			vodId: params.id,
		},
	});
	if (!vod) {
		return { playthroughId: null, scenarioSnapshotIds: [], vod: null };
	}
	const modules = normalizeSessionManifestModules(deps.modules) ?? [];
	const playthroughId = deps.playthroughId ?? crypto.randomUUID();
	const scenarioSnapshotIds = vod.scenarios.map(
		(_, index) => `snapshot-${playthroughId}-${index}`,
	);
	const started = await startPlaythroughAction({
		id: playthroughId,
		modules: [...modules],
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
	if (!started.success) {
		throw new Error(started.error);
	}
	return {
		playthroughId: started.playthrough.id,
		scenarioSnapshotIds: started.scenarioSnapshotIds,
		vod,
	};
}
