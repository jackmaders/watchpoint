import { describe, expect, it } from "vitest";
import {
	type ContentSearchParams,
	contentSearchSchema,
	toGetAdminVodsQuery,
	validateContentSearch,
} from "../search-params";

describe("admin content search-params", () => {
	it("parses valid search parameters with all fields", () => {
		// Arrange
		const raw = {
			role: "TANK",
			search: "Reinhardt",
			sortBy: "title",
			sortOrder: "asc",
			status: "PUBLISHED",
		};

		// Act
		const result = validateContentSearch(raw);

		// Assert
		expect(result).toEqual({
			role: "TANK",
			search: "Reinhardt",
			sortBy: "title",
			sortOrder: "asc",
			status: "PUBLISHED",
		});
	});

	it("falls back to empty object on invalid parameters", () => {
		// Arrange
		const raw = {
			role: "INVALID_ROLE",
			sortBy: 123,
			status: "UNKNOWN",
		};

		// Act
		const result = validateContentSearch(
			raw as unknown as Record<string, unknown>,
		);

		// Assert
		expect(result).toEqual({});
	});

	it("toGetAdminVodsQuery maps ContentSearchParams to database query object", () => {
		// Arrange & Act
		const queryPublished = toGetAdminVodsQuery({
			role: "TANK",
			search: "rein",
			status: "PUBLISHED",
		});
		const queryDraft = toGetAdminVodsQuery({
			role: "ALL",
			status: "DRAFT",
		});
		const queryAll = toGetAdminVodsQuery({
			status: "ALL",
		});

		// Assert
		expect(queryPublished).toEqual({
			isPublished: true,
			role: "TANK",
			search: "rein",
		});
		expect(queryDraft).toEqual({
			isPublished: false,
			role: undefined,
			search: undefined,
		});
		expect(queryAll).toEqual({
			isPublished: undefined,
			role: undefined,
			search: undefined,
		});
	});

	it("handles empty or undefined input gracefully", () => {
		// Arrange & Act
		const fromEmpty = validateContentSearch({});
		const fromUndefined = validateContentSearch(
			undefined as unknown as Record<string, unknown>,
		);

		// Assert
		expect(fromEmpty).toEqual({});
		expect(fromUndefined).toEqual({});
	});

	it("validates schema directly for valid values", () => {
		// Arrange
		const params: ContentSearchParams = {
			role: "DAMAGE",
			search: "tracer",
			sortBy: "durationSeconds",
			sortOrder: "desc",
			status: "DRAFT",
		};

		// Act
		const parsed = contentSearchSchema.safeParse(params);

		// Assert
		expect(parsed.success).toBe(true);
		if (parsed.success) {
			expect(parsed.data).toEqual(params);
		}
	});
});
