import { describe, expect, it } from "vitest";
import {
	catchDbError,
	D1DatabaseError,
	D1ErrorKind,
	parseD1Error,
} from "../errors";

describe("errors utility", () => {
	it("returns identical error when already a D1DatabaseError instance", () => {
		// Arrange
		const existing = new D1DatabaseError({
			kind: D1ErrorKind.UNIQUE_VIOLATION,
			message: "Pre-existing error",
		});

		// Act
		const result = parseD1Error(existing);

		// Assert
		expect(result).toBe(existing);
	});

	it("parses SQLite unique constraint violation with table and column", () => {
		// Arrange
		const rawError = new Error(
			"D1_ERROR: UNIQUE constraint failed: user.email",
		);

		// Act
		const result = parseD1Error(rawError);

		// Assert
		expect(result).toMatchObject({
			column: "email",
			kind: D1ErrorKind.UNIQUE_VIOLATION,
			message: "A record with this email already exists",
			table: "user",
		});
	});

	it("parses SQLite unique constraint violation without explicit table prefix", () => {
		// Arrange
		const rawError = new Error("UNIQUE constraint failed: token");

		// Act
		const result = parseD1Error(rawError);

		// Assert
		expect(result).toMatchObject({
			column: "token",
			kind: D1ErrorKind.UNIQUE_VIOLATION,
			message: "A record with this token already exists",
			table: undefined,
		});
	});

	it("parses foreign key constraint violations", () => {
		// Arrange
		const rawError = new Error("D1_ERROR: FOREIGN KEY constraint failed");

		// Act
		const result = parseD1Error(rawError);

		// Assert
		expect(result).toMatchObject({
			kind: D1ErrorKind.FOREIGN_KEY_VIOLATION,
			message: "Referenced relationship was not found or is in use",
		});
	});

	it("parses NOT NULL constraint violations", () => {
		// Arrange
		const rawError = new Error(
			"D1_ERROR: NOT NULL constraint failed: scenario.prompt_text",
		);

		// Act
		const result = parseD1Error(rawError);

		// Assert
		expect(result).toMatchObject({
			column: "prompt_text",
			kind: D1ErrorKind.NOT_NULL_VIOLATION,
			message: "Field 'prompt_text' is required",
			table: "scenario",
		});
	});

	it("parses CHECK constraint violations", () => {
		// Arrange
		const rawError = new Error(
			"D1_ERROR: CHECK constraint failed: duration_seconds > 0",
		);

		// Act
		const result = parseD1Error(rawError);

		// Assert
		expect(result).toMatchObject({
			kind: D1ErrorKind.CHECK_VIOLATION,
			message: "Check constraint failed: duration_seconds > 0",
		});
	});

	it("parses database busy and lock timeout errors", () => {
		// Arrange
		const rawTimeout = new Error("D1 DB storage operation exceeded timeout");
		const rawLocked = new Error("database is locked");
		const rawBusy = new Error("SQLITE_BUSY: database busy");

		// Act
		const resTimeout = parseD1Error(rawTimeout);
		const resLocked = parseD1Error(rawLocked);
		const resBusy = parseD1Error(rawBusy);

		// Assert
		expect(resTimeout.kind).toBe(D1ErrorKind.BUSY);
		expect(resLocked.kind).toBe(D1ErrorKind.BUSY);
		expect(resBusy.kind).toBe(D1ErrorKind.BUSY);
	});

	it("inspects error.cause if present on wrapped errors", () => {
		// Arrange
		const wrappedError = {
			cause: { message: "UNIQUE constraint failed: user.username" },
			message: "D1 Execution failure",
		};

		// Act
		const result = parseD1Error(wrappedError);

		// Assert
		expect(result).toMatchObject({
			column: "username",
			kind: D1ErrorKind.UNIQUE_VIOLATION,
			table: "user",
		});
	});

	it("falls back to unknown kind for generic errors", () => {
		// Arrange
		const genericError = new Error("Something completely unexpected");

		// Act
		const result = parseD1Error(genericError, "Fallback failure");

		// Assert
		expect(result).toMatchObject({
			kind: D1ErrorKind.UNKNOWN,
			message: "Something completely unexpected",
		});
	});

	it("uses fallback message when error string is empty or non-error object", () => {
		// Arrange
		const emptyError = {};
		const errorWithEmptyCause = { cause: {} };

		// Act
		const result = parseD1Error(emptyError, "Custom fallback");
		const resultEmptyCause = parseD1Error(
			errorWithEmptyCause,
			"Cause fallback",
		);

		// Assert
		expect(result).toMatchObject({
			kind: D1ErrorKind.UNKNOWN,
			message: "Custom fallback",
		});
		expect(resultEmptyCause).toMatchObject({
			kind: D1ErrorKind.UNKNOWN,
			message: "Cause fallback",
		});
	});

	it("handles string error inputs directly", () => {
		// Arrange
		const strError = "FOREIGN KEY constraint failed";

		// Act
		const result = parseD1Error(strError);

		// Assert
		expect(result.kind).toBe(D1ErrorKind.FOREIGN_KEY_VIOLATION);
	});

	it("catchDbError creates a rejecting handler that parses errors", () => {
		// Arrange
		const handler = catchDbError("Default fallback");
		const testError = new Error("FOREIGN KEY constraint failed");

		// Act
		const execute = () => handler(testError);

		// Assert
		expect(execute).toThrow(D1DatabaseError);
	});
});
