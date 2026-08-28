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
