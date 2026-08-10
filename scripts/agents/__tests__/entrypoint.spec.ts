import { afterEach, describe, expect, it, vi } from "vitest";
import { runIfMain } from "../entrypoint";

describe("runIfMain", () => {
	afterEach(() => {
		vi.unstubAllEnvs();
	});

	it("does not call main under NODE_ENV=test", () => {
		// Arrange
		vi.stubEnv("NODE_ENV", "test");
		const main = vi.fn();

		// Act
		runIfMain(main);

		// Assert
		expect(main).not.toHaveBeenCalled();
	});

	it("calls main when NODE_ENV is not test", () => {
		// Arrange
		vi.stubEnv("NODE_ENV", "production");
		const main = vi.fn();

		// Act
		runIfMain(main);

		// Assert
		expect(main).toHaveBeenCalled();
	});
});
