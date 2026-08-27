// Domain Services

export {
	insertAuditEntrySchema,
	selectAuditEntrySchema,
} from "./audit/validation";
export {
	insertUserSchema,
	selectUserSchema,
	type UpdateUserRoleInput,
	updateUserRoleInputSchema,
} from "./auth/validation";
export {
	createTableService,
	type TableWithId,
} from "./common/service";
export {
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
	getDb,
	type JsonPrimitive,
	type JsonValue,
	type PaginatedResult,
	type PaginationOptions,
	parseD1Error,
	toErrorMessage,
} from "./core";
export {
	insertAttemptRecordSchema,
	insertPlaythroughSchema,
	scenarioSnapshotInputSchema,
	selectAttemptRecordSchema,
	selectPlaythroughSchema,
} from "./playthroughs/validation";
// Schema
export {
	auditEntries,
	auditEntriesRelations,
} from "./schema/audit";
export {
	accounts,
	accountsRelations,
	sessions,
	sessionsRelations,
	type UserRole,
	userRoleEnum,
	users,
	usersRelations,
	verifications,
} from "./schema/auth";
export {
	attemptRecords,
	attemptRecordsRelations,
	type PlaythroughStatus,
	playthroughCompletions,
	playthroughCompletionsRelations,
	playthroughModuleSelections,
	playthroughModuleSelectionsRelations,
	playthroughStatusEnum,
	playthroughs,
	playthroughsRelations,
	scenarioSnapshots,
	scenarioSnapshotsRelations,
} from "./schema/playthroughs";
export {
	type HeroRole,
	heroRoleEnum,
	type InputType,
	inputTypeEnum,
	type ModuleType,
	moduleTypeEnum,
	scenarios,
	scenariosRelations,
	vods,
	vodsRelations,
} from "./schema/vods";
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
export {
	createAuditEntry,
	getAuditEntries,
	getAuditLogs,
} from "./services/audit.service";
// Auth & Users
export type {
	GetUsersOptions,
	UpdateUserRoleParams,
	UserItem,
} from "./services/auth.service";
export {
	getUserById,
	getUserCount,
	getUsers,
	updateUserRole,
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
	completePlaythrough,
	createPlaythrough,
	getAttemptByIdempotencyKey,
	getPlayerHistory,
	getPlaythrough,
	getPlaythroughAttempts,
	getPlaythroughHistoryDetail,
	IDEMPOTENCY_CONFLICT_ERROR,
	PLAYTHROUGH_NOT_IN_PROGRESS_ERROR,
	PLAYTHROUGH_START_CONFLICT_ERROR,
	queryPlayerHistory,
	recordPlaythroughAttempt,
} from "./services/playthroughs.service";

// VODs & Scenarios
export type {
	AdminVodItem,
	BulkOperationResult,
	CreateScenarioInput,
	CreateVodInput,
	DeleteScenarioInput,
	DeleteVodInput,
	GetAdminVodsOptions,
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
	bulkDeleteVods,
	bulkPublishVods,
	createScenario,
	createVod,
	deleteScenario,
	deleteVod,
	getAdminVods,
	getPublishedVods,
	getScenarioById,
	getScenariosByVodId,
	getSessionManifest,
	getVodById,
	reorderScenarios,
	scenarioTableService,
	setVodPublicationStatus,
	updateScenario,
	updateVod,
	vodTableService,
} from "./services/vods.service";
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
} from "./vods/validation";
