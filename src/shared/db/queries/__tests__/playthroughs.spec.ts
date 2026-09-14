/**
 * Tests direct domain query functions for playthroughs, completions, module selections, and scenario snapshots.
 *
 * Verifies standard list queries with pagination and filtering, inserts, updates, and deletions
 * using Drizzle 1.0 conventions and mocked client instances.
 */

import { describe, expect, it } from "vitest";
import {
	createPlaythrough,
	createPlaythroughCompletion,
	createPlaythroughModuleSelections,
	createScenarioSnapshots,
	deletePlaythrough,
	getPlaythroughById,
	queryPlaythroughCompletions,
	queryPlaythroughModuleSelections,
	queryPlaythroughs,
	queryScenarioSnapshots,
	updatePlaythrough,
} from "../playthroughs";

describe("playthroughs domain queries", () => {
	it("executes queryPlaythroughs with default limit and filtering", async () => {
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
										{ id: "playthrough-1", status: "IN_PROGRESS" },
									]);
								},
							}),
						}),
					}),
				}),
			}),
		} as unknown as Parameters<typeof queryPlaythroughs>[1];

		// Act
		const result = await queryPlaythroughs({ limit: 10 }, mockDb);

		// Assert
		expect(result).toEqual([{ id: "playthrough-1", status: "IN_PROGRESS" }]);
		expect(capturedSelect).toEqual(expect.objectContaining({ limitCount: 10 }));
	});

	it("executes getPlaythroughById and returns matching record", async () => {
		// Arrange
		const expectedPlaythrough = { id: "playthrough-1", status: "IN_PROGRESS" };
		const mockDb = {
			select: () => ({
				from: () => ({
					where: () => ({
						get: () => Promise.resolve(expectedPlaythrough),
					}),
				}),
			}),
		} as unknown as Parameters<typeof getPlaythroughById>[1];

		// Act
		const result = await getPlaythroughById("playthrough-1", mockDb);

		// Assert
		expect(result).toEqual(expectedPlaythrough);
	});

	it("executes createPlaythrough and returns inserted record", async () => {
		// Arrange
		const newPlaythrough = {
			id: "playthrough-1",
			status: "IN_PROGRESS" as const,
			userId: "user-1",
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
		} as unknown as Parameters<typeof createPlaythrough>[1];

		// Act
		const result = await createPlaythrough(newPlaythrough, mockDb);

		// Assert
		expect(result).toEqual(newPlaythrough);
	});

	it("executes updatePlaythrough and returns updated record", async () => {
		// Arrange
		const updatedRow = {
			id: "playthrough-1",
			status: "COMPLETED" as const,
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
		} as unknown as Parameters<typeof updatePlaythrough>[2];

		// Act
		const result = await updatePlaythrough(
			"playthrough-1",
			{ status: "COMPLETED" },
			mockDb,
		);

		// Assert
		expect(result).toEqual(updatedRow);
	});

	it("executes deletePlaythrough and returns deleted record", async () => {
		// Arrange
		const mockDb = {
			delete: () => ({
				where: () => ({
					returning: () => ({
						get: () => Promise.resolve({ id: "playthrough-1" }),
					}),
				}),
			}),
		} as unknown as Parameters<typeof deletePlaythrough>[1];

		// Act
		const result = await deletePlaythrough("playthrough-1", mockDb);

		// Assert
		expect(result).toEqual({ id: "playthrough-1" });
	});

	it("executes createPlaythroughCompletion and returns inserted record", async () => {
		// Arrange
		const newCompletion = {
			id: "comp-1",
			playthroughId: "playthrough-1",
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
		} as unknown as Parameters<typeof createPlaythroughCompletion>[1];

		// Act
		const result = await createPlaythroughCompletion(newCompletion, mockDb);

		// Assert
		expect(result).toEqual(newCompletion);
	});

	it("executes queryPlaythroughCompletions and returns matching list", async () => {
		// Arrange
		const expectedCompletions = [
			{ id: "comp-1", playthroughId: "playthrough-1" },
		];
		const mockDb = {
			select: () => ({
				from: () => ({
					where: () => ({
						orderBy: () => ({
							limit: () => ({
								all: () => Promise.resolve(expectedCompletions),
							}),
						}),
					}),
				}),
			}),
		} as unknown as Parameters<typeof queryPlaythroughCompletions>[1];

		// Act
		const result = await queryPlaythroughCompletions({}, mockDb);

		// Assert
		expect(result).toEqual(expectedCompletions);
	});

	it("executes createPlaythroughModuleSelections with empty array", async () => {
		// Act
		const result = await createPlaythroughModuleSelections([]);

		// Assert
		expect(result).toEqual([]);
	});

	it("executes createPlaythroughModuleSelections with records and returns inserted", async () => {
		// Arrange
		const selections = [
			{ moduleType: "STRATEGY" as const, playthroughId: "playthrough-1" },
		];
		const mockDb = {
			insert: () => ({
				values: (vals: unknown) => ({
					returning: () => ({
						all: () => Promise.resolve(vals),
					}),
				}),
			}),
		} as unknown as Parameters<typeof createPlaythroughModuleSelections>[1];

		// Act
		const result = await createPlaythroughModuleSelections(selections, mockDb);

		// Assert
		expect(result).toEqual(selections);
	});

	it("executes queryPlaythroughModuleSelections and returns matching list", async () => {
		// Arrange
		const expectedSelections = [
			{ moduleType: "STRATEGY" as const, playthroughId: "playthrough-1" },
		];
		const mockDb = {
			select: () => ({
				from: () => ({
					where: () => ({
						orderBy: () => ({
							limit: () => ({
								all: () => Promise.resolve(expectedSelections),
							}),
						}),
					}),
				}),
			}),
		} as unknown as Parameters<typeof queryPlaythroughModuleSelections>[1];

		// Act
		const result = await queryPlaythroughModuleSelections({}, mockDb);

		// Assert
		expect(result).toEqual(expectedSelections);
	});

	it("executes createScenarioSnapshots with empty array", async () => {
		// Act
		const result = await createScenarioSnapshots([]);

		// Assert
		expect(result).toEqual([]);
	});

	it("executes createScenarioSnapshots with records and returns inserted", async () => {
		// Arrange
		const snapshots = [
			{
				explanationText: "Explanation",
				id: "snap-1",
				imageUrl: null,
				inputConfig: {},
				inputType: "MULTIPLE_CHOICE" as const,
				moduleType: "STRATEGY" as const,
				playthroughId: "playthrough-1",
				position: 0,
				promptText: "Prompt",
				scenarioId: "scenario-1",
				timeLimitSeconds: 10,
				timestampSeconds: 15,
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
		} as unknown as Parameters<typeof createScenarioSnapshots>[1];

		// Act
		const result = await createScenarioSnapshots(snapshots, mockDb);

		// Assert
		expect(result).toEqual(snapshots);
	});

	it("executes queryScenarioSnapshots and returns matching list", async () => {
		// Arrange
		const expectedSnapshots = [{ id: "snap-1", position: 0 }];
		const mockDb = {
			select: () => ({
				from: () => ({
					where: () => ({
						orderBy: () => ({
							limit: () => ({
								all: () => Promise.resolve(expectedSnapshots),
							}),
						}),
					}),
				}),
			}),
		} as unknown as Parameters<typeof queryScenarioSnapshots>[1];

		// Act
		const result = await queryScenarioSnapshots({}, mockDb);

		// Assert
		expect(result).toEqual(expectedSnapshots);
	});
});
