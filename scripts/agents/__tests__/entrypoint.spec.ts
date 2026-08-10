import { describe, expect, it, vi } from "vitest";
import { runIfMain } from "../entrypoint";

describe("runIfMain", () => {
	it("runs main when the module was executed directly", () => {
		// Arrange
		const main = vi.fn();

		// Act
		runIfMain(true, main);

		// Assert
		expect(main).toHaveBeenCalled();
	});

	it("does not run main when the module was imported", () => {
		// Arrange
		const main = vi.fn();

		// Act
		runIfMain(false, main);

		// Assert
		expect(main).not.toHaveBeenCalled();
	});
});
