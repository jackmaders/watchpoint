/**
 * Route loader initializing the session manifest and durable playthrough generation.
 *
 * Implements `loadVodsIdSessionPage` to fetch the protected session manifest via `getProtectedSessionManifest`,
 * create a new playthrough generation via `startPlaythroughAction`, and initialize scenario snapshot IDs.
 */
import {
	getProtectedSessionManifest,
	normalizeSessionManifestModules,
	startPlaythroughAction,
} from "@/entities/vod";
import type { SessionSearch } from "../model/session-search";

export async function loadVodsIdSessionPage({
	deps,
	params,
}: {
	deps: SessionSearch;
	params: { id: string };
}) {
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
