import { describe, expect, it, vi } from "vitest";
import { executeSeed } from "../seeder";

vi.mock("better-auth/crypto");

describe("executeSeed", () => {
	it("deletes existing rows and inserts fixtures into database", async () => {
		// Arrange
		const deletedTables: unknown[] = [];
		const insertedRows: Array<{ table: unknown; values: unknown }> = [];

		const mockDb = {
			delete: vi.fn((table: unknown) => {
				deletedTables.push(table);
				return Promise.resolve();
			}),
			insert: vi.fn((table: unknown) => ({
				values: vi.fn((values: unknown) => {
					insertedRows.push({ table, values });
					return Promise.resolve();
				}),
			})),
		};

		// Act
		const result = await executeSeed(mockDb as never);

		// Assert
		expect(deletedTables.length).toBeGreaterThan(0);
		expect(insertedRows.length).toBe(4); // users, accounts, vods, scenarios
		expect(result.scenariosCount).toBe(5);
		expect(result.adminEmail).toBe("admin@local.watchpoint");
		expect(result.playerEmail).toBe("player@local.watchpoint");
	});
});
