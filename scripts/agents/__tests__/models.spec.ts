import { describe, expect, it } from "vitest";
import { MODELS } from "../models";

describe("MODELS registry", () => {
	it("maps the ping stage to a gemini CLI alias, not a concrete version", () => {
		// Arrange
		// Act
		const entry = MODELS.ping;

		// Assert
		expect(entry).toEqual({ cli: "gemini", model: "flash" });
	});

	it("only names Gemini CLI model aliases, never a dated version string", () => {
		// Arrange
		const versionStringPattern = /\d/;

		// Act
		const models = Object.values(MODELS).map((entry) => entry.model);

		// Assert
		for (const model of models) {
			expect(model).not.toMatch(versionStringPattern);
		}
	});
});
