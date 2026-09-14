/**
 * Tests direct domain query functions for the scenarios table.
 *
 * Verifies standard list queries with pagination and filtering, inserts,
 * updates, deletions, and scenario reordering using Drizzle 1.0 conventions.
 */

import { describe, expect, it } from "vitest";
import {
	createScenario,
	createScenarios,
	deleteScenario,
	getScenarioById,
	queryScenarios,
	reorderScenarios,
	updateScenario,
} from "../scenarios";

describe("scenarios domain queries", () => {
	it("executes queryScenarios with default limit and filtering", async () => {
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
										{ id: "scenario-1", promptText: "Test Prompt" },
									]);
								},
							}),
						}),
					}),
				}),
			}),
		} as unknown as Parameters<typeof queryScenarios>[1];

		// Act
		const result = await queryScenarios({ limit: 10 }, mockDb);

		// Assert
		expect(result).toEqual([{ id: "scenario-1", promptText: "Test Prompt" }]);
		expect(capturedSelect).toEqual(expect.objectContaining({ limitCount: 10 }));
	});

	it("executes createScenario and returns inserted record", async () => {
		// Arrange
		const newScenario = {
			explanationText: "Explanation",
			id: "scenario-1",
			imageUrl: null,
			inputConfig: { options: [] },
			inputType: "MULTIPLE_CHOICE" as const,
			moduleType: "STRATEGY" as const,
			promptText: "Prompt text",
			timeLimitSeconds: 15,
			timestampSeconds: 120.5,
			vodId: "vod-1",
		};
		const mockDb = {
			insert: () => ({
				values: (vals: unknown) => ({
					returning: () => ({
						get: () => Promise.resolve(vals),
					}),
				}),
			}),
		} as unknown as Parameters<typeof createScenario>[1];

		// Act
		const result = await createScenario(newScenario, mockDb);

		// Assert
		expect(result).toEqual(newScenario);
	});

	it("executes updateScenario and returns updated row", async () => {
		// Arrange
		const updatedRow = {
			id: "scenario-123",
			promptText: "Updated Prompt",
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
		} as unknown as Parameters<typeof updateScenario>[2];

		// Act
		const result = await updateScenario(
			"scenario-123",
			{ promptText: "Updated Prompt" },
			mockDb,
		);

		// Assert
		expect(result).toEqual(updatedRow);
	});

	it("executes deleteScenario and returns deleted row", async () => {
		// Arrange
		const mockDb = {
			delete: () => ({
				where: () => ({
					returning: () => ({
						get: () => Promise.resolve({ id: "scenario-123" }),
					}),
				}),
			}),
		} as unknown as Parameters<typeof deleteScenario>[1];

		// Act
		const result = await deleteScenario("scenario-123", mockDb);

		// Assert
		expect(result).toEqual({ id: "scenario-123" });
	});

	it("executes reorderScenarios with empty array returning empty result", async () => {
		// Act
		const result = await reorderScenarios([]);

		// Assert
		expect(result).toEqual([]);
	});

	it("executes reorderScenarios with updates returning all updated rows", async () => {
		// Arrange
		const orders = [
			{ id: "scenario-1", timestampSeconds: 10 },
			{ id: "scenario-2", timestampSeconds: 20 },
		];
		const mockDb = {
			update: () => ({
				set: (vals: unknown) => ({
					where: () => ({
						returning: () => ({
							get: () => Promise.resolve(vals),
						}),
					}),
				}),
			}),
		} as unknown as Parameters<typeof reorderScenarios>[1];

		// Act
		const result = await reorderScenarios(orders, mockDb);

		// Assert
		expect(result).toEqual([
			{ timestampSeconds: 10 },
			{ timestampSeconds: 20 },
		]);
	});

	it("executes createScenarios with empty array returning empty result", async () => {
		// Act
		const result = await createScenarios([]);

		// Assert
		expect(result).toEqual([]);
	});

	it("executes createScenarios and returns inserted records", async () => {
		// Arrange
		const newScenarios = [
			{
				explanationText: "Explanation 1",
				id: "scenario-1",
				imageUrl: null,
				inputConfig: { options: [] },
				inputType: "MULTIPLE_CHOICE" as const,
				moduleType: "STRATEGY" as const,
				promptText: "Prompt text 1",
				timeLimitSeconds: 15,
				timestampSeconds: 120.5,
				vodId: "vod-1",
			},
		];
		const mockDb = {
			insert: () => ({
				values: (vals: unknown) => ({
					returning: () => ({
						all: () => Promise.resolve(vals),
					}),
				}),
			}),
		} as unknown as Parameters<typeof createScenarios>[1];

		// Act
		const result = await createScenarios(newScenarios, mockDb);

		// Assert
		expect(result).toEqual(newScenarios);
	});

	it("executes getScenarioById and returns scenario row", async () => {
		// Arrange
		const mockScenario = { id: "scenario-123", promptText: "Prompt" };
		const mockDb = {
			select: () => ({
				from: () => ({
					where: () => ({
						get: () => Promise.resolve(mockScenario),
					}),
				}),
			}),
		} as unknown as Parameters<typeof getScenarioById>[1];

		// Act
		const result = await getScenarioById("scenario-123", mockDb);

		// Assert
		expect(result).toEqual(mockScenario);
	});
});
