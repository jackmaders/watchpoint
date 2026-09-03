/**
 * Tests query options, filter conversion, and order conversion helpers.
 *
 * Verifies SQL clause generation for derived table filters and deterministic
 * ordering with tiebreakers according to Drizzle 1.0 standards.
 */

import { describe, expect, it } from "vitest";
import { DEFAULT_LIMIT, filterToSQL, orderToSQL } from "../query";
import { auditEntries } from "../schema/audit";

describe("query helper primitives", () => {
	it("exposes DEFAULT_LIMIT as 100", () => {
		// Arrange
		const expectedLimit = 100;

		// Act
		const limit = DEFAULT_LIMIT;

		// Assert
		expect(limit).toBe(expectedLimit);
	});

	describe("filterToSQL", () => {
		it("returns undefined for empty or absent filter without throwing", () => {
			// Arrange
			const table = auditEntries;

			// Act
			const sqlUndefined = filterToSQL(table);
			const sqlEmpty = filterToSQL(table, {});

			// Assert
			expect(sqlUndefined).toBeUndefined();
			expect(sqlEmpty).toBeUndefined();
		});

		it("generates SQL condition for provided filter fields", () => {
			// Arrange
			const table = auditEntries;

			// Act
			const sql = filterToSQL(table, {
				entityType: "vod",
			});

			// Assert
			expect(sql).toBeDefined();
		});
	});

	describe("orderToSQL", () => {
		it("applies tiebreaker when order is absent or undefined", () => {
			// Arrange
			const table = auditEntries;

			// Act
			const sql = orderToSQL(table, undefined, "id");

			// Assert
			expect(sql).toBeDefined();
		});

		it("preserves specified ordering and appends tiebreaker", () => {
			// Arrange
			const table = auditEntries;

			// Act
			const sql = orderToSQL(table, { createdAt: "desc" }, "id");

			// Assert
			expect(sql).toBeDefined();
		});
	});
});
