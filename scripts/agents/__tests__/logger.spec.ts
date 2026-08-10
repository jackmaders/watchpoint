import { beforeEach, describe, expect, it, vi } from "vitest";
import { logger } from "../logger";

// The real module, not the `__mocks__` stand-in: this is the one spec that
// checks the forwarding itself. Spying on `console` keeps the run silent, which
// is also why the production logger needs no knowledge of the test environment.
describe("logger", () => {
	beforeEach(() => {
		vi.spyOn(console, "log").mockImplementation(() => {});
		vi.spyOn(console, "warn").mockImplementation(() => {});
		vi.spyOn(console, "error").mockImplementation(() => {});
	});

	it("forwards log to console", () => {
		// Arrange
		const message = "hello";

		// Act
		logger.log(message);

		// Assert
		expect(console.log).toHaveBeenCalledWith("hello");
	});

	it("forwards warn to console", () => {
		// Arrange
		const message = "hello";

		// Act
		logger.warn(message);

		// Assert
		expect(console.warn).toHaveBeenCalledWith("hello");
	});

	it("forwards error to console", () => {
		// Arrange
		const message = "hello";

		// Act
		logger.error(message);

		// Assert
		expect(console.error).toHaveBeenCalledWith("hello");
	});
});
