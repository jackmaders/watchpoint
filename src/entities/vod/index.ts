/**
 * Public domain entity API for Video On Demand (VOD) training sessions, playthrough telemetry,
 * and interactive scenario configuration.
 *
 * Re-exports the public interface of the `src/entities/vod/` slice adhering to Feature-Sliced
 * Design (FSD) architecture. Encapsulates server functions, action handlers, session manifest
 * normalization, attempt schemas, and module filter controls for consuming pages and features.
 */
export {
	handleGetVodManifest,
	handleVodManifestRequest,
} from "./api/manifest";
export {
	completeOwnedPlaythrough,
	createOwnedPlaythrough,
	getOwnedPlayerHistory,
	getOwnedPlaythrough,
	getOwnedPlaythroughAttempts,
} from "./api/owned-playthroughs";
export {
	type CompletePlaythroughResult,
	completePlaythroughAction,
	type PlaythroughScenarioInput,
	type StartPlaythroughInput,
	type StartPlaythroughResult,
	startPlaythroughAction,
} from "./api/playthrough";
export { recordAttemptAction } from "./api/record-attempt";
export {
	completePlaythrough,
	getProtectedSessionManifest,
	getPublishedVods,
	getSessionManifest,
	getVodById,
	recordAttempt,
	startPlaythrough,
} from "./api/server-fns";
export {
	type NormalizedSessionManifestQuery,
	normalizeSessionManifestModules,
	normalizeSessionManifestQuery,
	type SessionManifestTransportQuery,
} from "./api/session-manifest-query";
export {
	type AttemptOutcome,
	type RecordAttemptInput,
	RecordAttemptInputSchema,
	type RecordAttemptResult,
} from "./model/attempt";
export {
	buildSessionUrl,
	extractHeroFromTitle,
	OVERWATCH_HEROES,
	type OverwatchHero,
	serializeModulesParam,
} from "./model/module-filter";
export {
	calculateModuleCounts,
	filterScenariosByModules,
	getModuleBadge,
	getModuleDefinition,
	getModuleDescription,
	getModuleLabel,
	isModuleType,
	parseModuleTypes,
} from "./model/module-helpers";
export {
	DEFAULT_MODULE_TYPES,
	MODULE_DEFINITIONS,
	MODULE_MAP,
	type ModuleDefinition,
} from "./model/modules";
export { vodManifestApiRouteOptions } from "./model/route-options";
export {
	ModuleFilterPills,
	type ModuleFilterPillsProps,
} from "./ui/module-filter-pills";
