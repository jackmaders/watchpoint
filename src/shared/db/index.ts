// Audit
export type {
	AuditEntryItem,
	AuditEntryWithActor,
	CreateAuditEntryInput,
	GetAuditLogsOptions,
} from "./audit/repository";
export {
	createAuditEntry,
	getAuditEntries,
	getAuditLogs,
} from "./audit/repository";
export {
	insertAuditEntrySchema,
	selectAuditEntrySchema,
} from "./audit/validation";
// Auth & Users
export type {
	GetUsersOptions,
	UpdateUserRoleParams,
	UserItem,
} from "./auth/repository";
export {
	getUserById,
	getUserCount,
	getUsers,
	updateUserRole,
} from "./auth/repository";
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
// Playthroughs & Telemetry
export type {
	AttemptRecordItem,
	CreatePlaythroughInput,
	GetPlayerHistoryOptions,
	PlayerHistoryItem,
	PlayerHistoryResult,
	PlaythroughCompletionItem,
	PlaythroughItem,
	RecordPlaythroughAttemptInput,
	ScenarioSnapshotInput,
} from "./playthroughs/repository";
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
} from "./playthroughs/repository";
export {
	insertAttemptRecordSchema,
	insertPlaythroughSchema,
	scenarioSnapshotInputSchema,
	selectAttemptRecordSchema,
	selectPlaythroughSchema,
} from "./playthroughs/validation";
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
} from "./vods/service";
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
} from "./vods/service";
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
