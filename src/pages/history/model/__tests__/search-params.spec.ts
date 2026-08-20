import { describe, expect, it } from "vitest";
import { validateHistorySearch } from "../search-params";

describe("validateHistorySearch", () => {
	it("parses valid search parameters", () => {
		// Arrange
		const raw = {
			modules: ["STRATEGY", "TACTICS"],
			page: "2",
			pageSize: "20",
			status: "IN_PROGRESS",
			vodId: "vod_123",
		};

		// Act
		const result = validateHistorySearch(raw);

		// Assert
		expect(result).toEqual({
			modules: ["STRATEGY", "TACTICS"],
			page: 2,
			pageSize: 20,
			status: "IN_PROGRESS",
			vodId: "vod_123",
		});
	});

	it("parses comma-separated modules string", () => {
		// Arrange
		const raw = {
			modules: "STRATEGY,ULTIMATE",
		};

		// Act
		const result = validateHistorySearch(raw);

		// Assert
		expect(result.modules).toEqual(["STRATEGY", "ULTIMATE"]);
	});

	it("returns empty object when search input is invalid", () => {
		// Arrange
		const raw = {
			page: "-5",
			pageSize: "1000",
			status: "INVALID_STATUS",
		};

		// Act
		const result = validateHistorySearch(raw);

		// Assert
		expect(result).toEqual({});
	});
});
