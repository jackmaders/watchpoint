import { describe, expect, it } from "vitest";
import { normalizeSessionManifestModules } from "../session-manifest-query";

describe("normalizeSessionManifestModules", () => {
	it("normalizes comma-separated transport values into unique module types", () => {
		// Arrange
		const modules = ["strategy, TACTICS", "strategy"];

		// Act
		const result = normalizeSessionManifestModules(modules);

		// Assert
		expect(result).toEqual(["STRATEGY", "TACTICS"]);
	});

	it("returns undefined when the transport filter is empty", () => {
		// Arrange
		const modules = ["", "   "];

		// Act
		const result = normalizeSessionManifestModules(modules);

		// Assert
		expect(result).toBeUndefined();
	});

	it("returns undefined when no transport filter is provided", () => {
		// Arrange

		// Act
		const result = normalizeSessionManifestModules();

		// Assert
		expect(result).toBeUndefined();
	});

	it("returns an empty canonical filter when all nonblank values are invalid", () => {
		// Arrange
		const modules = "unknown,invalid";

		// Act
		const result = normalizeSessionManifestModules(modules);

		// Assert
		expect(result).toBeNull();
	});

	it("rejects malformed transport payloads at the adapter seam", () => {
		// Arrange
		const modules = 123;

		// Act & Assert
		expect(() => normalizeSessionManifestModules(modules)).toThrow();
	});
});
