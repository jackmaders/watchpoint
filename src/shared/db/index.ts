export { type DbContext, getDb } from "./client/client";
export type { RecordPlaythroughAttemptInput } from "./repositories/attempts";
export {
	getAttemptByIdempotencyKey,
	getPlaythroughAttempts,
	recordPlaythroughAttempt,
} from "./repositories/attempts";
export type {
	CreateAuditEntryInput,
	GetAuditLogsOptions,
} from "./repositories/audit";
export {
	createAuditEntry,
	getAuditEntries,
	getAuditLogs,
} from "./repositories/audit";
export type {
	CreatePlaythroughInput,
	GetPlayerHistoryOptions,
	PlayerHistoryItem,
	PlayerHistoryResult,
	ScenarioSnapshotInput,
} from "./repositories/playthroughs";
export {
	completePlaythrough,
	createPlaythrough,
	getPlayerHistory,
	getPlaythrough,
	getPlaythroughHistoryDetail,
	queryPlayerHistory,
} from "./repositories/playthroughs";
export type {
	GetUsersOptions,
	UpdateUserRoleParams,
	UpdateUserRoleResult,
	UserItem,
} from "./repositories/users";
export {
	getUserById,
	getUserCount,
	getUsers,
	updateUserRole,
} from "./repositories/users";
export type {
	AdminVodItem,
	BulkOperationResult,
	CreateScenarioInput,
	CreateScenarioResult,
	CreateVodInput,
	CreateVodResult,
	DeleteScenarioInput,
	DeleteScenarioResult,
	DeleteVodInput,
	DeleteVodResult,
	GetAdminVodsOptions,
	GetSessionManifestOptions,
	PublishedVodItem,
	ReorderScenariosInput,
	ReorderScenariosResult,
	SessionManifest,
	SetVodPublicationStatusInput,
	SetVodPublicationStatusResult,
	UpdateScenarioInput,
	UpdateScenarioResult,
	UpdateVodInput,
	UpdateVodResult,
} from "./repositories/vods";
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
	setVodPublicationStatus,
	updateScenario,
	updateVod,
	validateScenarioConfig,
	validateVodForPublishing,
} from "./repositories/vods";
export {
	attemptRecords,
	auditEntries,
	type HeroRole,
	heroRoleEnum,
	type InputType,
	inputTypeEnum,
	type JsonPrimitive,
	type JsonValue,
	type ModuleType,
	moduleTypeEnum,
	type PlaythroughStatus,
	playthroughCompletions,
	playthroughModuleSelections,
	playthroughStatusEnum,
	playthroughs,
	scenarioSnapshots,
	scenarios,
	type UserRole,
	userRoleEnum,
	vods,
} from "./schema";
