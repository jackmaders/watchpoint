import { describe, expect, it } from "vitest";
import { validateSessionSearch } from "../session-search";

describe("validateSessionSearch", () => {
	it("parses valid session search parameters", () => {
		// Arrange
		const raw = {
			modules: "AIM,CD_TRACKING",
			playthroughId: "a2b724bc-a62a-43bc-9171-87424ad41979",
			prototype: "media-recovery",
			variant: "A",
		};

		// Act
		const result = validateSessionSearch(raw);

		// Assert
		expect(result).toEqual(raw);
	});

	it("throws on invalid search parameters", () => {
		// Arrange
		const raw = {
			variant: "INVALID",
		};

		// Act & Assert
		expect(() => validateSessionSearch(raw)).toThrow();
	});
});
