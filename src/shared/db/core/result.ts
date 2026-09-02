/**
 * Defines the canonical result envelope and execution wrappers that encapsulate all database
 * operations, guaranteeing non-throwing failure semantics across the database layer.
 *
 * Implements the ADR-0010 `DbResult<T>` monadic success/failure contract. Exports constructor
 * helpers `dbSuccess` and `dbFailure`, the higher-order error formatting helper `toErrorMessage`,
 * and `tryDb` to safely wrap asynchronous Drizzle query executions without throwing unchecked exceptions.
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
