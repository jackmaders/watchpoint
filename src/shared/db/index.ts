/**
 * Entrypoint public API barrel exposing the complete database layer including core primitives,
 * relational schemas, seed fixtures, and domain services.
 *
 * Implements the layered database architecture public contract defined in ADR-0010. Re-exports
 * Cloudflare D1 connection resolvers and `DbResult<T>` wrappers from `core/`, Drizzle table definitions
 * and enums from `schema/`, domain service instances from `services/`, and validation schemas from `validation/`.
 */

// Queries & Helpers
export {
	buildPaginatedResult,
	buildWhereConditions,
	type ClampedPagination,
	catchDbError,
	clampPagination,
	D1DatabaseError,
	type D1DatabaseErrorOptions,
	D1ErrorKind,
	type DbContext,
	type DbResult,
	type DrizzleDb,
	dbFailure,
	dbSuccess,
	escapeLike,
	executeQuery,
	getDb,
	type JsonPrimitive,
	type JsonValue,
	type PaginatedResult,
	type PaginationOptions,
	parseD1Error,
	type TableFilterOptions,
	toErrorMessage,
	tryDb,
} from "./core";
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
	deleteScenario,
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
export {
	DEFAULT_LIMIT,
	filterToSQL,
	orderToSQL,
	type QueryOptions,
} from "./query";
export { accounts } from "./schema/account";
export { attemptRecords } from "./schema/attempt-record";
// Schema
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
// Seed
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
// Domain Services
export {
	auditService,
	authService,
	playthroughService,
	vodService,
} from "./services";
// Audit
export type {
	AuditEntryItem,
	AuditEntryWithActor,
	CreateAuditEntryInput,
	GetAuditLogsOptions,
} from "./services/audit.service";
// Auth & Users
export type {
	GetUsersOptions,
	UpdateUserRoleParams,
	UserItem,
} from "./services/auth.service";
// Playthroughs & Telemetry
export type {
	AttemptRecordItem,
	CreatePlaythroughInput,
	GetPlayerHistoryOptions,
	PlayerHistoryItem,
	PlayerHistoryResult,
	PlaythroughCompletionItem,
	PlaythroughItem,
	PlaythroughWithDetails,
	RecordPlaythroughAttemptInput,
	ScenarioSnapshotInput,
} from "./services/playthroughs.service";
export {
	IDEMPOTENCY_CONFLICT_ERROR,
	PLAYTHROUGH_NOT_IN_PROGRESS_ERROR,
	PLAYTHROUGH_START_CONFLICT_ERROR,
} from "./services/playthroughs.service";
// VODs & Scenarios
export type {
	AdminVodItem,
	BulkDeleteVodsInput,
	BulkOperationResult,
	BulkPublishVodsInput,
	CreateScenarioInput,
	CreateVodInput,
	DeleteScenarioInput,
	DeleteVodInput,
	GetAdminVodsOptions,
	GetSessionManifestInput,
	GetSessionManifestOptions,
	PublishedVodItem,
	ReorderScenariosInput,
	ScenarioItem,
	SessionManifest,
	SetVodPublicationStatusInput,
	UpdateScenarioInput,
	UpdateVodInput,
	VodItem,
} from "./services/vods.service";
export {
	insertAuditEntrySchema,
	selectAuditEntrySchema,
} from "./validation/audit";
export {
	insertUserSchema,
	selectUserSchema,
	type UpdateUserRoleInput,
	updateUserRoleInputSchema,
} from "./validation/auth";
export {
	insertAttemptRecordSchema,
	insertPlaythroughSchema,
	scenarioSnapshotInputSchema,
	selectAttemptRecordSchema,
	selectPlaythroughSchema,
} from "./validation/playthroughs";
export {
	boundedSliderConfigSchema,
	insertScenarioSchema,
	insertVodSchema,
	mapPinConfigSchema,
	multipleChoiceConfigSchema,
	multipleChoiceOptionSchema,
	percentSliderConfigSchema,
	selectScenarioSchema,
	selectVodSchema,
	timeSliderConfigSchema,
	validateInputConfigByType,
	validateScenarioConfig,
	validateVodForPublishing,
} from "./validation/vods";
