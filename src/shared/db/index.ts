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
	ListAuditEntriesByEntityInput,
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
