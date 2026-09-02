/**
 * Router view controller delegating between the production session player and media recovery prototypes.
 *
 * Implements `SessionPlayerRouteView` switching views based on URL search params (`search.prototype === "media-recovery"`).
 */
import { useCallback } from "react";
import type { SessionSearch } from "../model/session-search";
import type { ManifestVod } from "../model/use-session-player";
import type { MediaRecoveryPrototypeVariant } from "./session-player-media-recovery-prototype";
import { SessionPlayerMediaRecoveryPrototype } from "./session-player-media-recovery-prototype";
import { SessionPlayerPage } from "./session-player-page";

export interface SessionPlayerRouteViewProps {
	onNavigateSearch: (
		updater: (prev: Record<string, unknown>) => Record<string, unknown>,
	) => void;
	playthroughId: string | null;
	scenarioSnapshotIds: string[];
	search?: SessionSearch;
	vod: ManifestVod | null;
	vodId: string;
}

export function SessionPlayerRouteView({
	onNavigateSearch,
	playthroughId,
	scenarioSnapshotIds,
	search = {},
	vod,
	vodId,
}: SessionPlayerRouteViewProps) {
	const { modules, prototype, variant } = search;

	const setPrototypeVariant = useCallback(
		(nextVariant: MediaRecoveryPrototypeVariant) =>
			onNavigateSearch((previous) => ({
				...previous,
				prototype: "media-recovery",
				variant: nextVariant,
			})),
		[onNavigateSearch],
	);

	const exitPrototype = useCallback(
		() =>
			onNavigateSearch((previous) => ({
				...previous,
				prototype: undefined,
				variant: undefined,
			})),
		[onNavigateSearch],
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
			params={{ id: vodId }}
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
