/**
 * Entrypoint public API barrel exposing the database layer:
 * single-table schemas, relations, query functions, client factory, query helpers, and seed fixtures.
 */

// Client factory
export { createDbClient } from "./client";
// Queries
export {
	createAttemptRecord,
	deleteAttemptRecord,
	getAttemptRecordById,
	queryAttemptRecords,
	updateAttemptRecord,
} from "./queries/attempts";
export {
	createAuditEntry,
	deleteAuditEntry,
	getAuditEntryById,
	queryAuditEntries,
} from "./queries/audit";
export {
	createPlaythrough,
	createPlaythroughCompletion,
	createPlaythroughModuleSelections,
	createScenarioSnapshots,
	deletePlaythrough,
	getPlaythroughById,
	queryPlaythroughCompletions,
	queryPlaythroughModuleSelections,
	queryPlaythroughs,
	queryScenarioSnapshots,
	updatePlaythrough,
} from "./queries/playthroughs";
export {
	createScenario,
	createScenarios,
	deleteScenario,
	getScenarioById,
	queryScenarios,
	reorderScenarios,
	updateScenario,
} from "./queries/scenarios";
export {
	createUser,
	deleteUser,
	getUserByEmail,
	getUserById,
	queryUsers,
	updateUser,
} from "./queries/users";
export {
	bulkDeleteVods,
	bulkPublishVods,
	createVod,
	deleteVod,
	getVodById,
	queryVods,
	updateVod,
} from "./queries/vods";
// Query helpers
export {
	DEFAULT_LIMIT,
	filterToSQL,
	orderToSQL,
	type QueryOptions,
} from "./query";
// Schema definitions & enums
export { accounts } from "./schema/account";
export { attemptRecords } from "./schema/attempt-record";
export { auditEntries } from "./schema/audit";
export {
	type PlaythroughStatus,
	playthroughStatusEnum,
	playthroughs,
} from "./schema/playthrough";
export { playthroughCompletions } from "./schema/playthrough-completion";
export { playthroughModuleSelections } from "./schema/playthrough-module-selection";
export { relations } from "./schema/relations";
export {
	type InputType,
	inputTypeEnum,
	type ModuleType,
	moduleTypeEnum,
	scenarios,
} from "./schema/scenario";
export { scenarioSnapshots } from "./schema/scenario-snapshot";
export { sessions } from "./schema/session";
export {
	type UserRole,
	userRoleEnum,
	users,
} from "./schema/user";
export { verifications } from "./schema/verification";
export {
	type HeroRole,
	heroRoleEnum,
	vods,
} from "./schema/vod";
// Seed fixtures & runner
export {
	assertLocalSeedTarget,
	executeSeed,
	FIXTURE_IDS,
	FIXTURE_VOD,
	getLocalFixtureScenarios,
	getLocalFixtureVod,
	getSeedCredentials,
	type SeedCredentials,
	type SeedEnvironment,
} from "./seed";
// Type primitives
export type { JsonPrimitive, JsonValue } from "./types";
