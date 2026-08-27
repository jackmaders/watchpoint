import { describe, expect, it } from "vitest";
import { dbFailure, dbSuccess, toErrorMessage, tryDb } from "../result";

describe("dbResult helpers", () => {
	it("constructs a successful result object with data", () => {
		// Arrange
		const payload = { id: "test_1", value: 42 };

		// Act
		const result = dbSuccess(payload);

		// Assert
		expect(result).toEqual({
			data: payload,
			success: true,
		});
	});

	it("constructs a failure result object with error message", () => {
		// Arrange
		const errorMessage = "Database query failed";

		// Act
		const result = dbFailure(errorMessage);

		// Assert
		expect(result).toEqual({
			error: errorMessage,
			success: false,
		});
	});

	it("toErrorMessage returns error.message for Error instances", () => {
		// Arrange
		const error = new Error("Actual error");

		// Act
		const result = toErrorMessage(error, "Fallback");

		// Assert
		expect(result).toBe("Actual error");
	});

	it("toErrorMessage returns fallback for non-Error string instances", () => {
		// Arrange
		const error = "string error";

		// Act
		const result = toErrorMessage(error, "Fallback");

		// Assert
		expect(result).toBe("Fallback");
	});

	it("toErrorMessage returns fallback for null values", () => {
		// Arrange
		const error = null;

		// Act
		const result = toErrorMessage(error, "Fallback");

		// Assert
		expect(result).toBe("Fallback");
	});

	it("tryDb returns success result when operation resolves", async () => {
		// Arrange
		const operation = async () => ({ id: "123", name: "Ana" });

		// Act
		const result = await tryDb(operation);

		// Assert
		expect(result).toEqual({
			data: { id: "123", name: "Ana" },
			success: true,
		});
	});

	it("tryDb parses and returns failure when operation rejects", async () => {
		// Arrange
		const operation = async () => {
			throw new Error("UNIQUE constraint failed: user.email");
		};

		// Act
		const result = await tryDb(operation);

		// Assert
		expect(result).toEqual({
			error: "A record with this email already exists",
			success: false,
		});
	});

	it("tryDb uses fallback message when unknown error occurs", async () => {
		// Arrange
		const operation = async () => {
			throw "something unknown";
		};

		// Act
		const result = await tryDb(operation, "Custom fallback error");

		// Assert
		expect(result).toEqual({
			error: "Custom fallback error",
			success: false,
		});
	});
});
