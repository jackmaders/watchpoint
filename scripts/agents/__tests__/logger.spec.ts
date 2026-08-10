import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { logger } from "../logger";

describe("logger", () => {
	beforeEach(() => {
		vi.spyOn(console, "log").mockImplementation(() => {});
		vi.spyOn(console, "warn").mockImplementation(() => {});
		vi.spyOn(console, "error").mockImplementation(() => {});
	});

	afterEach(() => {
		vi.unstubAllEnvs();
	});

	describe("under NODE_ENV=test", () => {
		beforeEach(() => {
			vi.stubEnv("NODE_ENV", "test");
		});

		it("stays silent on log", () => {
			// Arrange
			// Act
			logger.log("hello");

			// Assert
			expect(console.log).not.toHaveBeenCalled();
		});

		it("stays silent on warn", () => {
			// Arrange
			// Act
			logger.warn("hello");

			// Assert
			expect(console.warn).not.toHaveBeenCalled();
		});

		it("stays silent on error", () => {
			// Arrange
			// Act
			logger.error("hello");

			// Assert
			expect(console.error).not.toHaveBeenCalled();
		});
	});

	describe("outside of tests", () => {
		beforeEach(() => {
			vi.stubEnv("NODE_ENV", "production");
		});

		it("forwards log to console", () => {
			// Arrange
			// Act
			logger.log("hello");

			// Assert
			expect(console.log).toHaveBeenCalledWith("hello");
		});

		it("forwards warn to console", () => {
			// Arrange
			// Act
			logger.warn("hello");

			// Assert
			expect(console.warn).toHaveBeenCalledWith("hello");
		});

		it("forwards error to console", () => {
			// Arrange
			// Act
			logger.error("hello");

			// Assert
			expect(console.error).toHaveBeenCalledWith("hello");
		});
	});
});
