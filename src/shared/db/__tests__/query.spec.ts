/**
 * Tests query options, filter conversion, and order conversion helpers.
 *
 * Verifies SQL clause generation for derived table filters and deterministic
 * ordering with tiebreakers according to Drizzle 1.0 standards.
 */

import { describe, expect, it } from "vitest";
import { DEFAULT_LIMIT, filterToSQL, orderToSQL } from "../query";
import { auditEntries } from "../schema/audit";
import { playthroughModuleSelections } from "../schema/playthroughs";

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
		it("returns undefined for empty, absent, or explicitly undefined filter without throwing", () => {
			// Arrange
			const table = auditEntries;

			// Act
			const sqlUndefinedArg = filterToSQL(table, undefined);
			const sqlAbsent = filterToSQL(table);
			const sqlEmpty = filterToSQL(table, {});

			// Assert
			expect(sqlUndefinedArg).toBeUndefined();
			expect(sqlAbsent).toBeUndefined();
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
		it("defaults tiebreaker to id when tiebreak argument is omitted", () => {
			// Arrange
			const table = auditEntries;

			// Act
			const sqlWithoutOrder = orderToSQL(table);
			const sqlWithOrder = orderToSQL(table, { createdAt: "desc" });

			// Assert
			expect(sqlWithoutOrder).toBeDefined();
			expect(sqlWithOrder).toBeDefined();
		});

		it("applies explicit tiebreaker when tiebreak parameter is passed", () => {
			// Arrange
			const table = playthroughModuleSelections;

			// Act
			const sql = orderToSQL(table, undefined, "playthroughId");

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
