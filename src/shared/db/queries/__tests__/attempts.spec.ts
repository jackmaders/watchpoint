/**
 * Tests direct domain query functions for the attempt_record table.
 *
 * Verifies standard list queries with pagination and filtering, inserts,
 * updates, and deletions using Drizzle 1.0 conventions and mocked client instances.
 */

import { describe, expect, it } from "vitest";
import {
	createAttemptRecord,
	deleteAttemptRecord,
	getAttemptRecordById,
	queryAttemptRecords,
	updateAttemptRecord,
} from "../attempts";

describe("attempts domain queries", () => {
	it("executes queryAttemptRecords with default limit and filtering", async () => {
		// Arrange
		let capturedSelect: unknown;
		const mockDb = {
			select: () => ({
				from: () => ({
					where: (whereClause: unknown) => ({
						orderBy: () => ({
							limit: (limitCount: number) => ({
								all: () => {
									capturedSelect = { limitCount, whereClause };
									return Promise.resolve([
										{ id: "attempt-1", isCorrect: true },
									]);
								},
							}),
						}),
					}),
				}),
			}),
		} as unknown as Parameters<typeof queryAttemptRecords>[1];

		// Act
		const result = await queryAttemptRecords({ limit: 10 }, mockDb);

		// Assert
		expect(result).toEqual([{ id: "attempt-1", isCorrect: true }]);
		expect(capturedSelect).toEqual(expect.objectContaining({ limitCount: 10 }));
	});

	it("executes getAttemptRecordById and returns matching record", async () => {
		// Arrange
		const expectedAttempt = { id: "attempt-1", isCorrect: true };
		const mockDb = {
			select: () => ({
				from: () => ({
					where: () => ({
						get: () => Promise.resolve(expectedAttempt),
					}),
				}),
			}),
		} as unknown as Parameters<typeof getAttemptRecordById>[1];

		// Act
		const result = await getAttemptRecordById("attempt-1", mockDb);

		// Assert
		expect(result).toEqual(expectedAttempt);
	});

	it("executes createAttemptRecord and returns inserted record", async () => {
		// Arrange
		const newAttempt = {
			id: "attempt-1",
			isCorrect: true,
			isTimedOut: false,
			responseTimeMs: 1200,
			userId: "user-1",
		};
		const mockDb = {
			insert: () => ({
				values: (vals: unknown) => ({
					returning: () => ({
						get: () => Promise.resolve(vals),
					}),
				}),
			}),
		} as unknown as Parameters<typeof createAttemptRecord>[1];

		// Act
		const result = await createAttemptRecord(newAttempt, mockDb);

		// Assert
		expect(result).toEqual(newAttempt);
	});

	it("executes updateAttemptRecord and returns updated record", async () => {
		// Arrange
		const updatedRow = {
			id: "attempt-1",
			isCorrect: false,
		};
		const mockDb = {
			update: () => ({
				set: () => ({
					where: () => ({
						returning: () => ({
							get: () => Promise.resolve(updatedRow),
						}),
					}),
				}),
			}),
		} as unknown as Parameters<typeof updateAttemptRecord>[2];

		// Act
		const result = await updateAttemptRecord(
			"attempt-1",
			{ isCorrect: false },
			mockDb,
		);

		// Assert
		expect(result).toEqual(updatedRow);
	});

	it("executes deleteAttemptRecord and returns deleted record", async () => {
		// Arrange
		const mockDb = {
			delete: () => ({
				where: () => ({
					returning: () => ({
						get: () => Promise.resolve({ id: "attempt-1" }),
					}),
				}),
			}),
		} as unknown as Parameters<typeof deleteAttemptRecord>[1];

		// Act
		const result = await deleteAttemptRecord("attempt-1", mockDb);

		// Assert
		expect(result).toEqual({ id: "attempt-1" });
	});
});
