import { describe, expect, it } from "vitest";
import { buildPaginatedResult, clampPagination, escapeLike } from "../query";

describe("escapeLike", () => {
	it("escapes percent signs", () => {
		// Arrange
		const input = "100% pure";

		// Act
		const result = escapeLike(input);

		// Assert
		expect(result).toBe("100\\% pure");
	});

	it("escapes underscore signs", () => {
		// Arrange
		const input = "user_name_test";

		// Act
		const result = escapeLike(input);

		// Assert
		expect(result).toBe("user\\_name\\_test");
	});

	it("escapes backslashes", () => {
		// Arrange
		const input = "path\\to\\file";

		// Act
		const result = escapeLike(input);

		// Assert
		expect(result).toBe("path\\\\to\\\\file");
	});

	it("escapes mixed special characters in single string", () => {
		// Arrange
		const input = "50%_discount\\code";

		// Act
		const result = escapeLike(input);

		// Assert
		expect(result).toBe("50\\%\\_discount\\\\code");
	});

	it("escapes consecutive special characters", () => {
		// Arrange
		const input = "%%__\\\\";

		// Act
		const result = escapeLike(input);

		// Assert
		expect(result).toBe("\\%\\%\\_\\_\\\\\\\\");
	});

	it("returns unchanged string when no special characters are present", () => {
		// Arrange
		const input = "plain search query 123";

		// Act
		const result = escapeLike(input);

		// Assert
		expect(result).toBe("plain search query 123");
	});

	it("returns empty string when input is empty", () => {
		// Arrange
		const input = "";

		// Act
		const result = escapeLike(input);

		// Assert
		expect(result).toBe("");
	});
});

describe("clampPagination", () => {
	it("returns default pagination when no options provided", () => {
		// Arrange
		const options = undefined;

		// Act
		const result = clampPagination(options);

		// Assert
		expect(result).toEqual({
			offset: 0,
			page: 1,
			pageSize: 10,
		});
	});

	it("returns default pagination when options is an empty object", () => {
		// Arrange
		const options = {};

		// Act
		const result = clampPagination(options);

		// Assert
		expect(result).toEqual({
			offset: 0,
			page: 1,
			pageSize: 10,
		});
	});

	it("preserves valid page and pageSize within allowed bounds", () => {
		// Arrange
		const options = { page: 3, pageSize: 25 };

		// Act
		const result = clampPagination(options);

		// Assert
		expect(result).toEqual({
			offset: 50,
			page: 3,
			pageSize: 25,
		});
	});

	it("clamps pageSize below 1 to 1", () => {
		// Arrange
		const options = { page: 2, pageSize: 0 };

		// Act
		const result = clampPagination(options);

		// Assert
		expect(result).toEqual({
			offset: 1,
			page: 2,
			pageSize: 1,
		});
	});

	it("clamps negative pageSize to 1", () => {
		// Arrange
		const options = { page: 1, pageSize: -10 };

		// Act
		const result = clampPagination(options);

		// Assert
		expect(result).toEqual({
			offset: 0,
			page: 1,
			pageSize: 1,
		});
	});

	it("clamps pageSize above 50 to 50", () => {
		// Arrange
		const options = { page: 2, pageSize: 100 };

		// Act
		const result = clampPagination(options);

		// Assert
		expect(result).toEqual({
			offset: 50,
			page: 2,
			pageSize: 50,
		});
	});

	it("clamps page below 1 to 1", () => {
		// Arrange
		const options = { page: 0, pageSize: 20 };

		// Act
		const result = clampPagination(options);

		// Assert
		expect(result).toEqual({
			offset: 0,
			page: 1,
			pageSize: 20,
		});
	});

	it("clamps negative page to 1", () => {
		// Arrange
		const options = { page: -5, pageSize: 15 };

		// Act
		const result = clampPagination(options);

		// Assert
		expect(result).toEqual({
			offset: 0,
			page: 1,
			pageSize: 15,
		});
	});

	it("floors floating point page and pageSize inputs", () => {
		// Arrange
		const options = { page: 2.9, pageSize: 15.8 };

		// Act
		const result = clampPagination(options);

		// Assert
		expect(result).toEqual({
			offset: 15,
			page: 2,
			pageSize: 15,
		});
	});

	it("falls back to defaults when NaN is provided", () => {
		// Arrange
		const options = { page: Number.NaN, pageSize: Number.NaN };

		// Act
		const result = clampPagination(options);

		// Assert
		expect(result).toEqual({
			offset: 0,
			page: 1,
			pageSize: 10,
		});
	});
});

describe("buildPaginatedResult", () => {
	it("correctly constructs a PaginatedResult from items, total, and clamped pagination", () => {
		// Arrange
		const items = [{ id: "1" }, { id: "2" }];
		const total = 25;
		const pagination = { offset: 0, page: 1, pageSize: 10 };

		// Act
		const result = buildPaginatedResult(items, total, pagination);

		// Assert
		expect(result).toEqual({
			items: [{ id: "1" }, { id: "2" }],
			page: 1,
			pageSize: 10,
			total: 25,
			totalPages: 3,
		});
	});

	it("ensures totalPages is at least 1 when total is 0", () => {
		// Arrange
		const items: Array<{ id: string }> = [];
		const total = 0;
		const pagination = { offset: 0, page: 1, pageSize: 10 };

		// Act
		const result = buildPaginatedResult(items, total, pagination);

		// Assert
		expect(result).toEqual({
			items: [],
			page: 1,
			pageSize: 10,
			total: 0,
			totalPages: 1,
		});
	});
});
