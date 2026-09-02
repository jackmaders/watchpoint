/**
 * Standardizes database and driver error classification across Cloudflare D1 and SQLite
 * execution boundaries, translating raw error strings into domain-actionable error types.
 *
 * Implements the error handling taxonomy defined in ADR-0010. Exports `D1ErrorKind` classifications,
 * the typed `D1DatabaseError` exception class, regex-based constraint parsers for unique, foreign key,
 * and check constraints, and higher-order `parseD1Error` and `catchDbError` adapters.
 */

export const D1ErrorKind = {
	BUSY: "BUSY",
	CHECK_VIOLATION: "CHECK_VIOLATION",
	FOREIGN_KEY_VIOLATION: "FOREIGN_KEY_VIOLATION",
	NOT_NULL_VIOLATION: "NOT_NULL_VIOLATION",
	TIMEOUT: "TIMEOUT",
	UNIQUE_VIOLATION: "UNIQUE_VIOLATION",
	UNKNOWN: "UNKNOWN",
} as const;

export type D1ErrorKind = (typeof D1ErrorKind)[keyof typeof D1ErrorKind];

export interface D1DatabaseErrorOptions {
	cause?: unknown;
	column?: string;
	kind: D1ErrorKind;
	message: string;
	table?: string;
}

export class D1DatabaseError extends Error {
	public readonly kind: D1ErrorKind;
	public readonly table?: string;
	public readonly column?: string;
	public override readonly cause?: unknown;

	constructor(options: D1DatabaseErrorOptions) {
		super(options.message);
		this.name = "D1DatabaseError";
		this.kind = options.kind;
		this.table = options.table;
		this.column = options.column;
		this.cause = options.cause;
	}
}

function extractErrorMessage(error: unknown): string {
	const rawMessage =
		error instanceof Error
			? error.message
			: typeof error === "string"
				? error
				: "";

	const causeMessage =
		error && typeof error === "object" && "cause" in error
			? ((error as { cause?: { message?: string } }).cause?.message ?? "")
			: "";

	return `${rawMessage} ${causeMessage}`.trim();
}

function parseKnownConstraintError(
	message: string,
	error: unknown,
): D1DatabaseError | null {
	const uniqueMatch = message.match(
		/UNIQUE constraint failed: (?:(\w+)\.)?(\w+)/,
	);
	if (uniqueMatch) {
		return new D1DatabaseError({
			cause: error,
			column: uniqueMatch[2],
			kind: D1ErrorKind.UNIQUE_VIOLATION,
			message: `A record with this ${uniqueMatch[2]} already exists`,
			table: uniqueMatch[1],
		});
	}

	if (message.includes("FOREIGN KEY constraint failed")) {
		return new D1DatabaseError({
			cause: error,
			kind: D1ErrorKind.FOREIGN_KEY_VIOLATION,
			message: "Referenced relationship was not found or is in use",
		});
	}

	const notNullMatch = message.match(
		/NOT NULL constraint failed: (?:(\w+)\.)?(\w+)/,
	);
	if (notNullMatch) {
		return new D1DatabaseError({
			cause: error,
			column: notNullMatch[2],
			kind: D1ErrorKind.NOT_NULL_VIOLATION,
			message: `Field '${notNullMatch[2]}' is required`,
			table: notNullMatch[1],
		});
	}

	const checkMatch = message.match(/CHECK constraint failed: (.+)/);
	if (checkMatch) {
		return new D1DatabaseError({
			cause: error,
			kind: D1ErrorKind.CHECK_VIOLATION,
			message: `Check constraint failed: ${checkMatch[1]}`,
		});
	}

	return null;
}

function isBusyOrLocked(message: string): boolean {
	return (
		message.includes("exceeded timeout") ||
		message.includes("database is locked") ||
		message.includes("SQLITE_BUSY")
	);
}

/**
 * Transforms raw Drizzle/D1/SQLite exceptions into a strongly typed D1DatabaseError
 */
export function parseD1Error(
	error: unknown,
	fallbackMessage = "Database operation failed",
): D1DatabaseError {
	if (error instanceof D1DatabaseError) {
		return error;
	}

	const fullMessage = extractErrorMessage(error);
	const constraintError = parseKnownConstraintError(fullMessage, error);
	if (constraintError) {
		return constraintError;
	}

	if (isBusyOrLocked(fullMessage)) {
		return new D1DatabaseError({
			cause: error,
			kind: D1ErrorKind.BUSY,
			message: "Database is temporarily busy, please retry",
		});
	}

	const rawMessage = error instanceof Error ? error.message : "";
	return new D1DatabaseError({
		cause: error,
		kind: D1ErrorKind.UNKNOWN,
		message: rawMessage || fallbackMessage,
	});
}

/**
 * Promise .catch() handler that throws a parsed D1DatabaseError
 */
export const catchDbError = (fallbackMessage = "Database operation failed") => {
	return (error: unknown): never => {
		throw parseD1Error(error, fallbackMessage);
	};
};
