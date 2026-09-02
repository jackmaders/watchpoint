/**
 * Provides standardized result envelope constructors and query execution wrappers
 * for database service operations across the application.
 *
 * Implements the ADR-0010 DbResult contract and execution primitives. Wraps Drizzle
 * query promises with D1 error parsing, normalizes single-record undefined lookups
 * to null, and provides safe operation wrappers.
 */

import { parseD1Error } from "./errors";

export type DbResult<T> =
	| { success: true; data: T }
	| { success: false; error: string };

export function dbSuccess<T>(data: T): DbResult<T> {
	return { data, success: true };
}

export function dbFailure<T = never>(error: string): DbResult<T> {
	return { error, success: false };
}

export function toErrorMessage(error: unknown, fallback: string): string {
	return parseD1Error(error, fallback).message;
}

export async function tryDb<T>(
	operation: () => Promise<T>,
	fallbackMessage = "Database operation failed",
): Promise<DbResult<T>> {
	try {
		const data = await operation();
		return dbSuccess(data);
	} catch (error) {
		const parsed = parseD1Error(error, fallbackMessage);
		return dbFailure(parsed.message);
	}
}

/**
 * Awaits a Drizzle query promise, normalizes `undefined` results to `null`
 * for single-record lookups, catches errors via `parseD1Error`, and returns
 * a strongly-typed `DbResult<T>`.
 */
export async function executeQuery<T>(
	query: Promise<T>,
	fallbackMessage = "Database operation failed",
): Promise<DbResult<T extends undefined ? null : T>> {
	try {
		const data = await query;
		const normalized = (data === undefined ? null : data) as T extends undefined
			? null
			: T;
		return dbSuccess(normalized);
	} catch (error) {
		const parsed = parseD1Error(error, fallbackMessage);
		return dbFailure(parsed.message);
	}
}
