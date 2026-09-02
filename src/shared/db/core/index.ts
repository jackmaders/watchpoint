/**
 * Consolidates and exposes foundational database primitives, connection resolvers, error handlers,
 * and result formatting helpers required by data access services and schema definitions.
 *
 * Serves as the core layer public API barrel for ADR-0010. Re-exports connection resolution (`getDb`,
 * `DbContext`, `DrizzleDb`), error handling (`D1DatabaseError`, `D1ErrorKind`, `parseD1Error`), query
 * utilities (`escapeLike`, `clampPagination`, `buildPaginatedResult`), and result monads (`DbResult`, `dbSuccess`, `dbFailure`, `tryDb`).
 */

export { type DbContext, type DrizzleDb, getDb } from "./client";
export {
	catchDbError,
	D1DatabaseError,
	type D1DatabaseErrorOptions,
	D1ErrorKind,
	parseD1Error,
} from "./errors";
export {
	buildPaginatedResult,
	buildWhereConditions,
	type ClampedPagination,
	clampPagination,
	escapeLike,
	type PaginatedResult,
	type PaginationOptions,
	type TableFilterOptions,
} from "./query";
export {
	type DbResult,
	dbFailure,
	dbSuccess,
	executeQuery,
	toErrorMessage,
	tryDb,
} from "./result";
export type { JsonPrimitive, JsonValue } from "./types";
