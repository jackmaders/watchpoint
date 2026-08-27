import { describe, expect, it } from "vitest";
import { dbFailure, dbSuccess, toErrorMessage } from "../result";

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
});
