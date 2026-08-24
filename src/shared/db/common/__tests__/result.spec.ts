import { describe, expect, it } from "vitest";
import { dbFailure, dbSuccess } from "../result";

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
});
